import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Brain, Shield, Palette, Globe, Keyboard, Trash2, PanelLeftClose } from 'lucide-react';

import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import './SettingsPage.css';

const NAV = [
  { id: 'profile', icon: <User size={15} />, label: 'Profile' },
  { id: 'memory', icon: <Brain size={15} />, label: 'Memory' },
  { id: 'privacy', icon: <Shield size={15} />, label: 'Privacy' },
  { id: 'appearance', icon: <Palette size={15} />, label: 'Appearance' },
  { id: 'language', icon: <Globe size={15} />, label: 'Language' },
  { id: 'shortcuts', icon: <Keyboard size={15} />, label: 'Shortcuts' },
  { id: 'usage', icon: <Brain size={15} />, label: 'Usage' },
];

const SHORTCUTS_LIST = [
  { keys: ['Enter'], desc: 'Send message' },
  { keys: ['Shift', 'Enter'], desc: 'New line in message' },
  { keys: ['Ctrl', 'K'], desc: 'New conversation' },
  { keys: ['Ctrl', '/'], desc: 'Open shortcuts' },
  { keys: ['Ctrl', 'Shift', 'S'], desc: 'Toggle sidebar' },
  { keys: ['Esc'], desc: 'Stop generation' },
];

function Toggle({ on, onToggle }) {
  return (
    <button className={`settings-toggle ${on ? 'on' : ''}`} onClick={onToggle}>
      <div className="settings-toggle-thumb" />
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    userProfile, setUserProfile, memoryEnabled, setMemoryEnabled, 
    memories, deleteMemory, clearAllConversations, theme, setTheme, 
    language, setLanguage, addToast, 
    exportAllData, deleteAccount, usage
  } = useChat();

  const [active, setActive] = useState('profile');
  const [name, setName] = useState(userProfile.name || '');
  const [instructions, setInstructions] = useState(userProfile.customInstructions || '');
  const [confirmClear, setConfirmClear] = useState(false);

  const saveProfile = () => {
    setUserProfile(p => ({ ...p, name: name.trim() || 'You', customInstructions: instructions }));
    addToast('Profile saved', 'success');
  };

  return (
    <div className="settings-page">
      {/* Sidebar nav */}
      <div className="settings-sidebar">
        <button className="settings-back-btn" onClick={() => navigate('/chat')}>
          <ArrowLeft size={15} /> Back to chat
        </button>
        {NAV.map(n => (
          <div key={n.id} className={`settings-nav-item ${active === n.id ? 'active' : ''}`} onClick={() => setActive(n.id)}>
            {n.icon} {n.label}
          </div>
        ))}
        <div style={{ flexGrow: 1 }} />
        <div className="settings-nav-item" style={{ color: '#f87171', marginTop: 'auto' }} onClick={() => { logout(); navigate('/login'); }}>
          <PanelLeftClose size={15} /> Log Out
        </div>
      </div>

      {/* Main content */}
      <div className="settings-main">

        {/* ── PROFILE ── */}
        {active === 'profile' && (
          <>
            <div className="settings-section-title">Profile</div>
            <div className="settings-section-desc">Personalize how Spectra refers to you and behaves.</div>
            <div className="settings-group">
              <div className="settings-group-label">Identity</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Your name</div>
                  <div className="settings-row-desc">How the AI addresses you</div>
                </div>
                <input className="settings-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={40} />
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-label">Custom Instructions</div>
              <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                <div className="settings-row-label">System prompt</div>
                <div className="settings-row-desc">Tell the AI how to behave, what tone to use, or what to know about you. Applied to all conversations.</div>
                <textarea
                  className="settings-input" rows={5}
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="E.g. You are a helpful coding assistant. Keep answers concise. Prefer TypeScript over JavaScript."
                />
              </div>
            </div>

            <button className="btn-primary" style={{ marginTop: 8 }} onClick={saveProfile}>Save changes</button>
          </>
        )}

        {/* ── MEMORY ── */}
        {active === 'memory' && (
          <>
            <div className="settings-section-title">Memory</div>
            <div className="settings-section-desc">Control what Spectra remembers about you across sessions.</div>
            <div className="settings-group">
              <div className="settings-group-label">Memory settings</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Enable memory</div>
                  <div className="settings-row-desc">AI learns and remembers your preferences over time</div>
                </div>
                <Toggle on={memoryEnabled} onToggle={() => setMemoryEnabled(p => !p)} />
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-label">Stored memories ({memories.length})</div>
              {memories.length === 0 ? (
                <div className="memory-empty">No memories stored yet. The AI will save useful facts as you chat.</div>
              ) : (
                <div className="memory-list">
                  {memories.map(m => (
                    <div key={m.id} className="memory-item">
                      <span className="memory-text">{m.text}</span>
                      <button className="memory-delete" onClick={() => { deleteMemory(m.id); addToast('Memory deleted', 'success'); }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── PRIVACY ── */}
        {active === 'privacy' && (
          <>
            <div className="settings-section-title">Privacy & Data</div>
            <div className="settings-section-desc">Control how your data is stored, used, and deleted.</div>
            
            <div className="settings-group">
              <div className="settings-group-label">Data Portability (GDPR)</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Export my data</div>
                  <div className="settings-row-desc">Download a JSON file containing all your conversations and usage records</div>
                </div>
                <button className="btn-secondary" onClick={async () => {
                  try {
                    const res = await exportAllData();
                    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `spectra-data-export.json`;
                    a.click();
                    addToast('Data export started', 'success');
                  } catch (err) { addToast('Export failed', 'error'); }
                }}>Export Data</button>
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-label">Data controls</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Clear all conversations</div>
                  <div className="settings-row-desc">Permanently delete your entire chat history</div>
                </div>
                {confirmClear ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="settings-danger-btn" onClick={() => { clearAllConversations(); setConfirmClear(false); navigate('/chat'); }}>Confirm delete</button>
                    <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setConfirmClear(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className="settings-danger-btn" onClick={() => setConfirmClear(true)}>Clear history</button>
                )}
              </div>
              
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label" style={{ color: '#f87171' }}>Delete Account</div>
                  <div className="settings-row-desc">Permanently delete your account and all associated data. This action is irreversible.</div>
                </div>
                <button className="settings-danger-btn" onClick={async () => {
                  if (confirm('Are you absolutely sure you want to delete your account? This will permanently remove all your data.')) {
                    try {
                      await deleteAccount();
                      logout();
                      navigate('/login');
                      addToast('Account deleted successfully', 'success');
                    } catch (err) { addToast('Deletion failed', 'error'); }
                  }
                }}>Delete Account</button>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-lg)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              🔒 Your data is stored securely in our enterprise-grade database. We encrypt all traffic and never use your data to train external models. We are fully GDPR & CCPA compliant.
            </div>
          </>
        )}


        {/* ── APPEARANCE ── */}
        {active === 'appearance' && (
          <>
            <div className="settings-section-title">Appearance</div>
            <div className="settings-section-desc">Customize how Spectra looks and feels.</div>
            <div className="settings-group">
              <div className="settings-group-label">Theme</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {[
                  { id: 'dark', icon: '🌙', label: 'Dark Mode' },
                  { id: 'light', icon: '☀️', label: 'Light Mode' }
                ].map(({ id, icon, label }) => (
                  <div
                    key={id}
                    className={`theme-card ${theme === id ? 'active' : ''}`}
                    onClick={() => setTheme(id)}
                  >
                    <div style={{ fontSize: 32 }}>{icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-label">Interface</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Compact mode</div>
                  <div className="settings-row-desc">Reduce padding and font size for a more dense UI</div>
                </div>
                <Toggle on={false} onToggle={() => addToast('Compact mode coming soon!', 'info')} />
              </div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Side-panel auto-hide</div>
                  <div className="settings-row-desc">Automatically hide the sidebar on smaller screens</div>
                </div>
                <Toggle on={true} onToggle={() => {}} />
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-label">Animations</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Reduced motion</div>
                  <div className="settings-row-desc">Minimize transitions and layout animations</div>
                </div>
                <Toggle on={false} onToggle={() => {}} />
              </div>
            </div>
          </>
        )}

        {/* ── LANGUAGE ── */}
        {active === 'language' && (
          <>
            <div className="settings-section-title">Language</div>
            <div className="settings-section-desc">Set your preferred interface and response language.</div>
            <div className="settings-group">
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Interface language</div>
                  <div className="settings-row-desc">Language used for UI elements</div>
                </div>
                <select className="settings-select" value={language} onChange={e => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="hi">हिन्दी</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Response language</div>
                  <div className="settings-row-desc">Language the AI uses when responding</div>
                </div>
                <select className="settings-select" defaultValue="auto">
                  <option value="auto">Auto-detect</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* ── SHORTCUTS ── */}
        {active === 'shortcuts' && (
          <>
            <div className="settings-section-title">Keyboard Shortcuts</div>
            <div className="settings-section-desc">All available keyboard shortcuts in Spectra AI.</div>
            <div className="shortcut-table">
              {SHORTCUTS_LIST.map((s, i) => (
                <div key={i} className="shortcut-table-row">
                  <div className="st-keys">
                    {s.keys.map((k, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <kbd className="st-key">{k}</kbd>
                        {j < s.keys.length - 1 && <span className="st-plus">+</span>}
                      </div>
                    ))}
                  </div>
                  <span className="st-desc">{s.desc}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── USAGE ── */}
        {active === 'usage' && (
          <>
            <div className="settings-section-title">Usage & Limits</div>
            <div className="settings-section-desc">Monitor your token consumption and account limits.</div>
            
            <div className="settings-group">
              <div className="settings-group-label">Current Usage</div>
              {usage ? (
                <div style={{ padding: '20px', background: 'var(--bg-elevated)', border: '1px solid var(--border-normal)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 600 }}>
                    <span>Tokens used today</span>
                    <span style={{ color: 'var(--brand-primary)' }}>{Math.round((usage.total_tokens / usage.daily_budget) * 100)}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ height: '100%', background: 'var(--gradient-brand)', width: `${Math.min(100, (usage.total_tokens / usage.daily_budget) * 100)}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>{usage.total_tokens.toLocaleString()} tokens</span>
                    <span>{usage.daily_budget.toLocaleString()} limit</span>
                  </div>
                </div>
              ) : (
                <div className="memory-empty">Usage data is currently unavailable.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
