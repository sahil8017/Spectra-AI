import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./chatPage.css";

const ChatPage = () => {
  const { id } = useParams();
  const [active, setActive] = useState("Chat");
  const messages = useMemo(
    () => [
      { id: 1, role: "ai", text: "Hi! I’m your learning co‑pilot. How can I help you today?" },
      { id: 2, role: "user", text: "Give me an intro and learning options about Photosynthesis." },
      { id: 3, role: "ai", text: "Here’s a quick overview and a few paths: summary, flashcards, quiz, or notes." },
    ],
    []
  );

  return (
    <div className="chat-view">
      <div className="chat-header">
        <h3 className="chat-title">{id === "new-session" ? "New Chat: Introduction and Learning Options" : decodeURIComponent(id)}</h3>
        <div className="chat-tabs">
          {(["Chat", "Flashcards", "Quizzes", "Notes"]).map((t) => (
            <button key={t} className={`tab-btn ${active === t ? "active" : ""}`} onClick={() => setActive(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="messages-area">
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.role}`}>{m.text}</div>
        ))}
      </div>

      <form className="chat-input" onSubmit={(e)=>{e.preventDefault();}}>
        <input className="chat-field" placeholder="Type your message..." />
        <button className="send-btn" aria-label="Send message">
          <svg viewBox="0 0 24 24" className="send-icon"><path d="M3 12l18-9-6 18-3-7-9-2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        </button>
      </form>
    </div>
  );
};

export default ChatPage;
