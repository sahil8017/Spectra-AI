import React from 'react';
import './ChatInput.css'; // We'll create this CSS file next

// --- SVG Icons for the new input box ---
const ZapIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const UpArrowIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 19V5m-7 7l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


// --- The Reusable Component ---
const ChatInput = ({ value, onChange, onSubmit }) => {
    return (
        <div className="chat-input-wrapper">
            <form className="chat-input-form" onSubmit={onSubmit}>
                <div className="icon-group">
                    <button type="button" className="icon-button">
                        <ZapIcon />
                    </button>
                    <button type="button" className="icon-button">
                        <PlusIcon />
                    </button>
                </div>
                <input
                    className="chat-field"
                    placeholder="Ask anything..."
                    value={value}
                    onChange={onChange}
                />
                <button type="submit" className="send-button" aria-label="Send message">
                    <UpArrowIcon />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;