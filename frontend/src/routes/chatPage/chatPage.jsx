import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import NewPrompt from "../../components/newPrompt/NewPrompt";
import ReactMarkdown from "react-markdown";
import "./chatPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
const YOUTUBE_URL_REGEX = /(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Ref to prevent double-firing auto-send
  const hasInitialized = useRef(null);
  const hasAutoSent = useRef(false);

  const { id } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- CORE SEND LOGIC (Defined early so useEffect can use it) ---
  const handleSend = async (prompt, file = null) => {
    if (isSending) return;
    setIsSending(true);

    // 1. Optimistic UI Update
    const userMsgId = crypto.randomUUID();
    const aiMsgId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: prompt },
      { id: aiMsgId, role: "ai", text: "Thinking...", isThinking: true },
    ]);

    try {
      const token = await getToken();
      let response;

      // 2. API Call
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("prompt", prompt);
        response = await fetch(`${API_BASE_URL}/api/document`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else if (YOUTUBE_URL_REGEX.test(prompt) || YOUTUBE_ID_REGEX.test(prompt)) {
        let youtubeUrl = prompt.match(YOUTUBE_URL_REGEX)?.[0];
        if (!youtubeUrl) youtubeUrl = `https://youtu.be/${prompt}`;
        
        response = await fetch(`${API_BASE_URL}/api/youtube`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: youtubeUrl }),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/send-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chatId: id, text: prompt }),
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to get response");
      }

      const data = await response.json();
      const aiText = data.ai || data.summary || data.result || "Done";

      // 3. Update UI with real response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: aiText, isThinking: false }
            : msg
        )
      );

    } catch (error) {
      console.error("API Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: `Error: ${error.message}`, isError: true, isThinking: false }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  // --- LOAD HISTORY & AUTO-SEND EFFECT ---
  useEffect(() => {
    if (!id) return;
    if (hasInitialized.current === id) return; // Prevent double load on same ID

    const loadAndAutoSend = async () => {
      hasInitialized.current = id;
      setIsLoading(true);
      
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/api/chat/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Chat not found");

        const data = await response.json();
        
        const formattedHistory = data.history.map((msg) => ({
          ...msg,
          id: crypto.randomUUID(),
        }));
        
        setMessages(formattedHistory);

        // --- 🔥 KEY FIX IS HERE ---
        // Check if this is a new chat (empty history) AND we have a firstPrompt waiting
        if (formattedHistory.length === 0 && location.state?.firstPrompt && !hasAutoSent.current) {
          console.log("Auto-sending initial prompt:", location.state.firstPrompt);
          hasAutoSent.current = true;
          
          // Wait a brief tick to ensure state is settled, then send
          setTimeout(() => {
             handleSend(location.state.firstPrompt, location.state.file);
             
             // Clear the state so a refresh doesn't re-send
             navigate(location.pathname, { replace: true, state: {} });
          }, 100);
        }

      } catch (error) {
        console.error("Error loading chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndAutoSend();
  }, [id, getToken, location.state, navigate]);


  if (isLoading) return <div className="chatPage loading">Loading chat...</div>;

  return (
    <div className="chatPage">
      <div className="wrapper">
        <div className="chat">
          {messages.length === 0 && !isLoading && !isSending && (
            <div className="empty-state">Start a conversation...</div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.role} ${msg.isError ? "error" : ""} ${msg.isThinking ? "thinking" : ""}`}
            >
              {msg.role === "ai" || msg.role === "model" ? (
                 <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                 <p>{msg.text}</p>
              )}
            </div>
          ))}

          <NewPrompt 
            onSend={handleSend} 
            isLoading={isLoading} 
            isSending={isSending} 
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;