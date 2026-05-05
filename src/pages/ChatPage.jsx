import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import ChatHeader from '../components/layout/ChatHeader';
import ChatContainer from '../components/chat/ChatContainer';
import { useChat } from '../context/ChatContext';

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { 
    conversations, 
    setCurrentConversationId, 
    currentDocId, 
    setCurrentDocId 
  } = useChat();

  useEffect(() => {
    if (conversationId) {
      const exists = conversations.some(c => c.id === conversationId);
      if (exists) {
        setCurrentConversationId(conversationId);
      } else {
        navigate('/chat', { replace: true });
      }
    } else {
      setCurrentConversationId(null);
    }
  }, [conversationId, conversations, setCurrentConversationId, navigate]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <ChatHeader 
          hasDoc={!!currentDocId} 
          onClearDoc={() => setCurrentDocId(null)} 
        />
        <ChatContainer />
      </main>
    </div>
  );
}
