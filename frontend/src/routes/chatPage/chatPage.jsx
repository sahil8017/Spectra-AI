import React, { useState, useEffect, useRef } from 'react';
import './chatPage.css';

// SVG Icon component (No changes needed here)
const ModernInputIcon = ({ type }) => {
    const paths = {
      switcher: "M13 10V3L4 14h7v7l9-11h-7z",
      youtube: "M12.2,12.4c-0.6,0-1,0.5-1,1s0.5,1,1,1s1-0.5,1-1S12.7,12.4,12.2,12.4z M17.9,12.1c-0.2-0.8-0.9-1.5-1.7-1.7 c-1.5-0.4-3.9-0.4-5.4,0C10,10.6,9.3,11.3,9.1,12.1c-0.2,1.2-0.2,3.7,0,4.9c0.2,0.8,0.9,1.5,1.7,1.7c1.5,0.4,3.9,0.4,5.4,0 c0.8-0.2,1.5-0.9,1.7-1.7C18.1,15.8,18.1,13.3,17.9,12.1z",
      upload: "M12 5v14m-7-7h14",
      submit: "M5 12h14M12 5l7 7-7 7",
    };
    const path = paths[type];
    return (
      <svg viewBox="0 0 24 24" className={`input-icon icon-${type}`} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    );
};

// Main Chat Page Component
const ChatPage = () => {
    const [messages, setMessages] = useState([]);
    const [inputMode, setInputMode] = useState('question');
    const messagesEndRef = useRef(null);
    const formRef = useRef(null);
    // NEW: Create a ref for the hidden file input
    const fileInputRef = useRef(null);

    const initialCodeSnippet = `import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import './chatPage.css';

// Icon component (no changes needed here)
const ModernInputIcon = ({ type }) => {
    // ...
};`;

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }, 0);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        setMessages([
            { id: 1, role: 'ai', text: 'Hi! I`m your learning co-pilot. How can I help you today?' },
            { id: 2, role: 'user', text: 'Can you show me what some code looks like in here?' },
            { id: 3, role: 'ai', text: 'Of course! Here is a sample React component. Notice how the formatting is preserved.' },
            { id: 4, role: 'user', text: initialCodeSnippet }
        ]);
    }, []);

    const handleSendMessage = (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const messageText = (formData.get(inputMode) || "").toString().trim();
        
        if (!messageText) return;

        const userMessage = { id: Date.now(), role: 'user', text: messageText };
        const aiResponse = { id: Date.now() + 1, role: 'ai', text: 'Thinking...' };
        
        setMessages(prevMessages => [...prevMessages, userMessage, aiResponse]);
        
        formRef.current.reset();
        const textareas = formRef.current.querySelectorAll('.modern-input');
        textareas.forEach(textarea => {
            textarea.style.height = 'auto';
            if (textarea.parentElement) {
                textarea.parentElement.style.height = '52px';
            }
        });

        setTimeout(() => {
            setMessages(prev => prev.map(msg => 
                msg.id === aiResponse.id ? {...msg, text: "That's an interesting question! I'm processing it now."} : msg
            ));
        }, 1500);
    };

    const handleInputResize = (e) => {
        const textarea = e.target;
        textarea.style.height = 'auto';
        const newHeight = `${textarea.scrollHeight}px`;
        textarea.style.height = newHeight;

        if (textarea.parentElement) {
            textarea.parentElement.style.height = newHeight;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            formRef.current.requestSubmit();
        }
    };
    
    // NEW: Handler for the '+' button click
    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    // NEW: Handler for when a file is selected
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // You can now handle the file upload logic
            console.log('File selected:', file.name);
            // Example: Add a message to the chat indicating a file was selected
            const fileMessage = { id: Date.now(), role: 'user', text: `You selected the file: ${file.name}` };
            setMessages(prev => [...prev, fileMessage]);
        }
    };

    return (
        <div className="chat-view">
            <div className="messages-area">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                        <pre><code>{msg.text}</code></pre>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-wrapper">
                <form ref={formRef} className={`modern-input-wrapper ${inputMode}`} onSubmit={handleSendMessage}>
                    {/* NEW: Hidden file input element */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        style={{ display: 'none' }} 
                        aria-hidden="true"
                    />

                    <div className="input-container">
                        <button
                            type="button"
                            className="input-button mode-switch-btn"
                            onClick={() => setInputMode(prev => prev === 'question' ? 'youtube' : 'question')}
                            aria-label="Switch input mode"
                        >
                            <div className="icon-flipper">
                                <ModernInputIcon type="switcher" />
                                <ModernInputIcon type="youtube" />
                            </div>
                        </button>

                        {/* UPDATED: The '+' button now triggers the file input */}
                        <button 
                            type="button" 
                            className="input-button upload-btn" 
                            aria-label="Upload file"
                            onClick={handleUploadClick}
                        >
                            <ModernInputIcon type="upload" />
                        </button>

                        <div className="input-fields-container">
                            <textarea
                                className="modern-input"
                                name="question"
                                placeholder="Ask anything..."
                                autoComplete="off"
                                rows="1"
                                onInput={handleInputResize}
                                onKeyDown={handleKeyDown}
                            />
                            <textarea
                                className="modern-input"
                                name="youtube"
                                placeholder="Paste a YouTube video link..."
                                autoComplete="off"
                                rows="1"
                                onInput={handleInputResize}
                                onKeyDown={handleKeyDown}
                            />
                        </div>

                        <button type="submit" className="input-button modern-submit-btn" aria-label="Submit">
                            <ModernInputIcon type="submit" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// The rest of your file remains unchanged...

const ChatStyles = () => ( <style>{`...`}</style>);

export default function App() {
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <>
      <div className="app-container">
        <ChatPage />
      </div>
    </>
  );
}