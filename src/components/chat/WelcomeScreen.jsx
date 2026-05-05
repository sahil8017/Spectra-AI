import { useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './WelcomeScreen.css';

const SHORTCUTS = [
  { keys: ['Enter'], desc: 'Send message' },
  { keys: ['Shift', 'Enter'], desc: 'New line' },
  { keys: ['Ctrl', 'K'], desc: 'New conversation' },
  { keys: ['Ctrl', '/'], desc: 'Show shortcuts' },
];

const SpectraLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  </svg >
);

export default function WelcomeScreen({ onSelectSuggestion }) {
  const { quickSuggestions, userProfile, setUserProfile } = useChat();
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('spectra_onboarded'));
  const [tempName, setTempName] = useState('');

  const dismissOnboarding = () => { localStorage.setItem('spectra_onboarded', '1'); setOnboarded(true); };

  const handleNameSubmit = (e) => {
    if (e.key === 'Enter' && tempName.trim()) {
      setUserProfile(prev => ({ ...prev, name: tempName.trim() }));
    }
  };

  return (
    <div className="welcome-screen">
      {/* First-time onboarding overlay */}
      {!onboarded && (
        <div className="onboarding-overlay">
          <div className="onboarding-card">
            <button className="onboarding-close" onClick={dismissOnboarding}><X size={16} /></button>
            <h2 className="onboarding-title">Welcome to Spectra AI</h2>
            <p className="onboarding-desc">
              Here's what you can do to get started:
            </p>
            <div className="onboarding-steps">
              <div className="onboarding-step"><span className="ob-num">1</span><span>Type any question in the input box below</span></div>
              <div className="onboarding-step"><span className="ob-num">2</span><span>Upload a <strong>PDF</strong> via the 📎 button to activate document Q&A</span></div>
              <div className="onboarding-step"><span className="ob-num">3</span><span>Paste a <strong>YouTube URL</strong> to get an instant summary</span></div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 4 }} onClick={dismissOnboarding}>
              Got it, let's go <SpectraLogo size={16} />
            </button>
          </div>
        </div>
      )}

      <h1 className="welcome-title">
        {!userProfile.name ? (
          <div className="name-input-container">
            Hello, what's your name?
            <input 
              type="text" 
              className="welcome-name-input" 
              placeholder="Type your name and hit Enter..."
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={handleNameSubmit}
              autoFocus
            />
          </div>
        ) : (
          `Hello, ${userProfile.name}. How can I help?`
        )}
      </h1>
      <p className="welcome-subtitle">
        Ask anything, upload a PDF, or paste a YouTube link. I'm ready.
      </p>

      {/* Quick suggestions */}
      <div className="suggestions-grid">
        {quickSuggestions.map(s => (
          <div key={s.id} className="suggestion-card fade-up" onClick={() => onSelectSuggestion(s.label)}>
            <span className="suggestion-label">{s.label}</span>
          </div>
        ))}
      </div>


    </div>
  );
}
