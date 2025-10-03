import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import './chatPage.css';

const ChatPage = () => {
    const { id } = useParams(); //
    const location = useLocation(); //
    const [messages, setMessages] = useState([]); //
    const messagesEndRef = useRef(null); //

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); //
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]); //

    useEffect(() => {
        if (location.state?.initialPrompt) { //
            setMessages([
                { id: 1, role: 'user', text: location.state.initialPrompt }, //
                { id: 2, role: 'ai', text: 'That is an excellent question! Let me look into that for you...' } //
            ]);
        } else {
            setMessages([
                { id: 1, role: 'ai', text: 'Hi! I’m your learning co‑pilot. How can I help you today?' } //
            ]);
        }
    }, [id, location.state]); //

    return (
        <div className="chat-view">
        
            {/* THIS IS THE NEW SPACER ELEMENT WE ARE ADDING */}
            <div className="spacer"></div>

            <div className="messages-area">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="action-area">
                {/* Action area content */}
            </div>
        </div>
    );
};

export default ChatPage;