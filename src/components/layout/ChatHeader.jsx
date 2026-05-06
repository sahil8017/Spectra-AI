import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PanelLeftOpen, PanelLeftClose, ChevronDown,
  SquarePen, Share2, X
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './ChatHeader.css';

const MODEL_ICONS = {
  'spectra-flash': '⚡',
  'spectra-pro':   '🧠',
  'spectra-rag':   '📄',
};

export default function ChatHeader({ onClearDoc, hasDoc }) {
  const {
    sidebarOpen, toggleSidebar,
    createNewConversation,
    selectedModel, setSelectedModel, availableModels,
    currentConversation,
  } = useChat();
  const navigate       = useNavigate();
  const [showModels, setShowModels] = useState(false);
  const dropRef        = useRef(null);

  const handleNewChat = () => {
    navigate('/chat');
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showModels) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowModels(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModels]);

  const current = availableModels.find(m => m.id === selectedModel) || availableModels[0];

  return (
    <header className="chat-header">
      {/* LEFT */}
      <div className="chat-header-left">
        <button
          className="header-sidebar-btn"
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
        </button>

        {!sidebarOpen && (
          <button className="header-sidebar-btn" onClick={handleNewChat} title="New chat">
            <SquarePen size={18} />
          </button>
        )}



        {/* Doc context indicator */}
        {hasDoc && (
          <div className="doc-context-pill">
            📄 Doc active
            <button onClick={onClearDoc} title="Clear document context">
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="chat-header-right">
        {currentConversation && (
          <button
            className="header-icon-btn"
            title="Share conversation"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
          >
            <Share2 size={17} />
          </button>
        )}
      </div>
    </header>
  );
}
