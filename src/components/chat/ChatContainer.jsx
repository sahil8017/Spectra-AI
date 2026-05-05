import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import { ChevronDown, WifiOff } from 'lucide-react';
import './ChatContainer.css';

export default function ChatContainer() {
  const { currentConversation, sendMessage, uploadDocument, regenerateResponse, isLoading, currentConversationId, currentDocId, isOnline } = useChat();
  const navigate = useNavigate();
  const scrollRef  = useRef(null);
  const bottomRef  = useRef(null);
  const [showJump, setShowJump] = useState(false);

  const messages = currentConversation?.messages || [];

  // Auto-scroll on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom || isLoading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // Show jump-to-bottom when scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowJump(distFromBottom > 300);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSendMessage = async (text) => {
    const activeId = await sendMessage(text, currentConversationId);
    if (!currentConversationId && activeId && activeId !== '__temp__') {
      navigate(`/chat/${activeId}`, { replace: true });
    }
  };

  return (
    <div className="chat-wrapper">
      {/* Offline banner */}
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff size={14}/> You're offline. Messages will send when reconnected.
        </div>
      )}

      <div className="chat-scroll-area" ref={scrollRef}>
        {messages.length === 0 ? (
          <WelcomeScreen onSelectSuggestion={handleSendMessage} />
        ) : (
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={idx === messages.length - 1}
                onRegenerate={regenerateResponse}
              />
            ))}

            {/* Typing indicator */}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="loading-message-row">
                <div className="message-inner">
                  <div className="message-avatar" style={{ background:'var(--gradient-brand)', color:'#fff' }}>✦</div>
                  <div className="loading-bubble">
                    <div className="typing-dots"><span/><span/><span/></div>
                    <span className="typing-label">Spectra is thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} style={{ height: 8 }} />
          </div>
        )}
      </div>

      {/* Jump to bottom */}
      {showJump && (
        <button className="jump-to-bottom" onClick={scrollToBottom}>
          <ChevronDown size={16}/> Latest
        </button>
      )}

      <ChatInput
        onSendMessage={handleSendMessage}
        onFileUpload={(f, msg) => uploadDocument(f, msg, currentConversationId)}
        isLoading={isLoading}
        hasDoc={!!currentDocId}
      />
    </div>
  );
}
