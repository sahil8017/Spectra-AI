import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Settings, Sun, Moon, Search, MessageSquare, PanelLeftClose, Pin, X, Clock, Pencil } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './Sidebar.css';

const SpectraLogo = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3.34 7V17L12 22L20.66 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 2V7" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M3.34 7L7.67 9.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M20.66 7L16.33 9.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M3.34 17L7.67 14.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M20.66 17L16.33 14.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 22V17" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 7L16.33 9.5L12 12L7.67 9.5L12 7Z" fill="currentColor" fillOpacity="1.0" />
    <path d="M7.67 9.5V14.5L12 17V12L7.67 9.5Z" fill="currentColor" fillOpacity="0.7" />
    <path d="M16.33 9.5V14.5L12 17V12L16.33 9.5Z" fill="currentColor" fillOpacity="0.4" />
  </svg>
);

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

export default function Sidebar() {
  const { conversations, deleteConversation, createNewConversation, pinConversation, sidebarOpen, setSidebarOpen, theme, toggleTheme, setCurrentConversationId, tempChatMode, setTempChatMode, exportConversation, renameConversation } = useChat();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'pinned'

  const handleNew = () => {
    navigate('/chat');
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const handleSelect = (id) => {
    setCurrentConversationId(id);
    navigate(`/chat/${id}`);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteConversation(id);
    if (conversationId === id) navigate('/chat');
  };

  const handlePin = (e, id) => {
    e.stopPropagation();
    pinConversation(id);
  };

  const handleRename = (id, newTitle) => {
    renameConversation(id, newTitle);
  };

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter(c => c.pinned);
  const recent = filtered.filter(c => !c.pinned);

  const groups = { Today: [], Yesterday: [], 'This week': [], Older: [] };
  recent.forEach(c => {
    const d = Math.floor((Date.now() - new Date(c.createdAt)) / 86400000);
    if (d === 0) groups['Today'].push(c);
    else if (d === 1) groups['Yesterday'].push(c);
    else if (d <= 7) groups['This week'].push(c);
    else groups['Older'].push(c);
  });

  const displayList = activeTab === 'pinned' ? pinned : recent;

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen && window.innerWidth <= 768 ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>

        {/* Header */}
        <div className="sidebar-header">
          <a href="/" className="sidebar-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <SpectraLogo />
            <span className="sidebar-logo-name">Spectra AI</span>
          </a>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* New chat */}
        <button className="new-chat-btn" onClick={handleNew}>
          <Plus size={16} /> New conversation
        </button>

        {/* Workspace tabs */}
        <div className="sidebar-tabs">
          <button className={`sidebar-tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
            <MessageSquare size={13} /> Chats
          </button>
          <button className={`sidebar-tab ${activeTab === 'pinned' ? 'active' : ''}`} onClick={() => setActiveTab('pinned')}>
            <Pin size={13} /> Pinned {pinned.length > 0 && <span className="sidebar-tab-badge">{pinned.length}</span>}
          </button>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <div className="sidebar-search-wrap">
            <Search size={14} className="sidebar-search-icon" />
            <input className="sidebar-search-input" placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><X size={13} /></button>}
          </div>
        </div>

        {/* Temp chat toggle */}
        <div className="sidebar-temp-toggle">
          <div className="sidebar-temp-info">
            <Clock size={13} />
            <span>Temporary chat</span>
          </div>
          <button className={`toggle-switch ${tempChatMode ? 'on' : ''}`} onClick={() => { setTempChatMode(p => !p); if (!tempChatMode) navigate('/chat'); }}>
            <div className="toggle-thumb" />
          </button>
        </div>

        {/* Conversations */}
        <div className="conversations-scroll">
          {activeTab === 'pinned' && pinned.length === 0 ? (
            <div className="conv-empty">
              <div className="conv-empty-title">No pinned chats</div>
              <div className="conv-empty-desc">Pin important conversations for quick access</div>
            </div>
          ) : displayList.length === 0 ? (
            <div className="conv-empty">
              <div className="conv-empty-title">{search ? 'No results' : 'No conversations yet'}</div>
              <div className="conv-empty-desc">{search ? 'Try a different keyword' : 'Start a new chat to get going'}</div>
            </div>
          ) : (
            activeTab === 'pinned' ? (
              displayList.map(conv => <ConvItem key={conv.id} conv={conv} active={conversationId === conv.id} onSelect={handleSelect} onDelete={handleDelete} onPin={handlePin} onRename={handleRename} onExport={exportConversation} />)
            ) : (
              Object.entries(groups).map(([label, items]) => items.length > 0 && (
                <div key={label}>
                  <div className="conv-section-label">{label}</div>
                  {items.map(conv => <ConvItem key={conv.id} conv={conv} active={conversationId === conv.id} onSelect={handleSelect} onDelete={handleDelete} onPin={handlePin} onRename={handleRename} onExport={exportConversation} />)}
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-footer-btn" onClick={() => { navigate('/settings'); if (window.innerWidth <= 768) setSidebarOpen(false); }}>
            <Settings size={16} /> Settings
          </button>
        </div>
      </aside>
    </>
  );
}

function ConvItem({ conv, active, onSelect, onDelete, onPin, onRename, onExport }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title);

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(conv.title);
  };

  const handleSave = (e) => {
    e.stopPropagation();
    if (editTitle.trim() && editTitle !== conv.title) {
      onRename(conv.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave(e);
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(conv.title);
    }
  };

  return (
    <div className={`conv-item ${active ? 'active' : ''}`} onClick={() => onSelect(conv.id)}>
      <div className="conv-item-body">
        {isEditing ? (
          <input
            className="conv-item-edit-input"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <div className="conv-item-title" title={conv.title}>{conv.title}</div>
        )}
      </div>
      {!isEditing && (
        <div className="conv-item-actions">
          <div className="conv-item-date">{timeAgo(conv.createdAt)}</div>
          <button className="conv-action-btn" title="Rename" onClick={handleStartEdit}>
            <Pencil size={12} />
          </button>
          <button className="conv-action-btn" title={conv.pinned ? 'Unpin' : 'Pin'} onClick={e => onPin(e, conv.id)} style={conv.pinned ? { color: 'var(--brand-primary)' } : {}}>
            <Pin size={12} />
          </button>
          <button className="conv-action-btn" title="Delete" onClick={e => onDelete(e, conv.id)}>
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
