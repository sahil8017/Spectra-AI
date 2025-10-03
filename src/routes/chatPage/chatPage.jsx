import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import './chatPage.css';

// Icon component (no changes needed here)
const ModernInputIcon = ({ type }) => {
    const paths = {
      switcher: "M13 10V3L4 14h7v7l9-11h-7z",
      youtube: "M12.2,12.4c-0.6,0-1,0.5-1,1s0.5,1,1,1s1-0.5,1-1S12.7,12.4,12.2,12.4z M17.9,12.1c-0.2-0.8-0.9-1.5-1.7-1.7 c-1.5-0.4-3.9-0.4-5.4,0C10,10.6,9.3,11.3,9.1,12.1c-0.2,1.2-0.2,3.7,0,4.9c0.2,0.8,0.9,1.5,1.7,1.7c1.5,0.4,3.9,0.4,5.4,0 c0.8-0.2,1.5-0.9,1.7-1.7C18.1,15.8,18.1,13.3,17.9,12.1z",
      upload: "M12 5v14m-7-7h14",
    };
    const path = type === 'submit' ? "M12 5v14M12 5l-5 5M12 5l5 5" : paths[type];
    return (
      <svg viewBox="0 0 24 24" className={`input-icon icon-${type}`} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    );
};

const ChatPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const [messages, setMessages] = useState([]);
    const [inputMode, setInputMode] = useState('question');
    const messagesEndRef = useRef(null);
    const formRef = useRef(null); // Ref for the form to reset textareas

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (location.state?.initialPrompt) {
            setMessages([
                { id: 1, role: 'user', text: location.state.initialPrompt },
                { id: 2, role: 'ai', text: 'That is an excellent question! Let me look into that for you...' }
            ]);
        } else {
            setMessages([
                { id: 1, role: 'ai', text: 'Hi! I’m your learning co‑pilot. How can I help you today?' }
            ]);
        }
    }, [id, location.state]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const messageText = (formData.get(inputMode) || "").toString().trim();
        
        if (!messageText) return;

        const userMessage = { id: Date.now(), role: 'user', text: messageText };
        const aiResponse = { id: Date.now() + 1, role: 'ai', text: 'Thinking...' };
        
        setMessages(prevMessages => [...prevMessages, userMessage, aiResponse]);
        
        // Reset form and manually reset textarea heights
        formRef.current.reset();
        const textareas = formRef.current.querySelectorAll('.modern-input');
        textareas.forEach(textarea => {
            textarea.style.height = 'auto';
        });
    };

    // IMPROVEMENT: Function to auto-resize textarea height
    const handleInputResize = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    return (
        <div className="chat-view">
            <div className="messages-area">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-wrapper">
                <form ref={formRef} className={`modern-input-wrapper ${inputMode}`} onSubmit={handleSendMessage}>
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

                        <button type="button" className="input-button upload-btn" aria-label="Upload file">
                            <ModernInputIcon type="upload" />
                        </button>

                        <div className="input-fields-container">
                            {/* IMPROVEMENT: Changed from input to textarea */}
                            <textarea
                                className="modern-input"
                                name="question"
                                placeholder="Ask anything..."
                                autoComplete="off"
                                rows="1"
                                onInput={handleInputResize}
                            />
                            <textarea
                                className="modern-input"
                                name="youtube"
                                placeholder="Paste a YouTube video link..."
                                autoComplete="off"
                                rows="1"
                                onInput={handleInputResize}
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

export default ChatPage;