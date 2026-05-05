import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChatProvider } from './context/ChatContext';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import ToastContainer from './components/ui/ToastContainer';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <ChatProvider>
        <Routes>
          <Route path="/"                     element={<LandingPage />} />
          <Route path="/chat"                 element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
          <Route path="/settings"             element={<SettingsPage />} />
        </Routes>
        <ToastContainer />
      </ChatProvider>
    </BrowserRouter>
  );
}

export default App;
