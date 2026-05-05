import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Brain, Shield, Palette, Globe, Keyboard, Trash2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import './SettingsPage.css';

const NAV = [
  { id: 'profile', icon: <User size={15} />, label: 'Profile' },
  { id: 'memory', icon: <Brain size={15} />, label: 'Memory' },
  { id: 'privacy', icon: <Shield size={15} />, label: 'Privacy' },
  { id: 'appearance', icon: <Palette size={15} />, label: 'Appearance' },
  { id: 'language', icon: <Globe size={15} />, label: 'Language' },
  { id: 'shortcuts', icon: <Keyboard size={15} />, label: 'Shortcuts' },
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
  const { userProfile, setUserProfile, memoryEnabled, setMemoryEnabled, memories, deleteMemory, clearAllConversations, theme, setTheme, language, setLanguage, selectedModel, setSelectedModel, availableModels, addToast, tempChatMode, setTempChatMode } = useChat();
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
              <div className="settings-group-label">Chat mode</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">Temporary chat mode</div>
                  <div className="settings-row-desc">Conversations won't be saved to history</div>
                </div>
                <Toggle on={tempChatMode} onToggle={() => setTempChatMode(p => !p)} />
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
                  <div className="settings-row-label">Disable AI training</div>
                  <div className="settings-row-desc">Your data will never be used to train AI models</div>
                </div>
                <Toggle on={true} onToggle={() => addToast('Data training is already disabled by default', 'info')} />
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-lg)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              🔒 All conversations are stored locally in your browser. No data is sent to external servers beyond the AI inference request. We are fully GDPR & CCPA compliant.
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
      </div>
    </div>
  );
}
