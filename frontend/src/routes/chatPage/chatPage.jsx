import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import "./chatPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

const YOUTUBE_URL_REGEX =
  /(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const ModernInputIcon = ({ type }) => {
  const paths = {
    upload: "M12 5v14m-7-7h14",
    submit: "M5 12h14M12 5l7 7-7 7",
  };
  const path = paths[type];
  return (
    <svg
      viewBox="0 0 24 24"
      className={`input-icon icon-${type}`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
};

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const hasInitialized = useRef(false);
  const hasProcessedFirstPrompt = useRef(false);

  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    if (!id || hasInitialized.current) return;
    
    hasInitialized.current = true;
    setIsLoading(true);
    setMessages([]);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/chat/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Chat not found or access denied.");
      }

      const data = await response.json();
      console.log("Loaded chat history:", data);
      
      const formattedHistory = data.history.map((msg) => ({
        ...msg,
        id: crypto.randomUUID(),
      }));

      setMessages(formattedHistory);
    } catch (error) {
      console.error("Error loading chat history:", error);
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [id, getToken, navigate]);

  // Fetch AI response
  const fetchResponse = useCallback(
    async (prompt, mode, file = null) => {
      if (isSending) {
        console.log("Already sending, skipping...");
        return;
      }
      
      console.log("Starting fetchResponse with prompt:", prompt);
      setIsSending(true);

      try {
        const token = await getToken();
        let response;

        // Determine API endpoint based on mode
        if (mode === "document" && file) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("prompt", prompt);

          response = await fetch(`${API_BASE_URL}/api/document`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
        } else if (mode === "youtube") {
          let youtubeUrl = null;
          const urlMatch = prompt.match(YOUTUBE_URL_REGEX);
          if (urlMatch) {
            youtubeUrl = urlMatch[0];
          } else if (YOUTUBE_ID_REGEX.test(prompt)) {
            youtubeUrl = `https://youtu.be/${prompt}`;
          } else {
            throw new Error("Couldn't detect a valid YouTube URL or ID.");
          }

          response = await fetch(`${API_BASE_URL}/api/youtube`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              url: youtubeUrl,
            }),
          });
        } else {
          console.log("Sending message to /api/send-message");
          response = await fetch(`${API_BASE_URL}/api/send-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              chatId: id,
              text: prompt,
            }),
          });
        }

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "An unknown API error occurred.");
        }

        const data = await response.json();
        console.log("API Response:", data);

        // Extract AI response from various possible fields
        let aiText = "";
        if (data && typeof data.summary === "string") {
          aiText = data.summary;
        } else if (data && typeof data.ai === "string") {
          aiText = data.ai;
        } else if (data && typeof data.result === "string") {
          aiText = data.result;
        } else if (data && typeof data.message === "string") {
          aiText = data.message;
        } else if (data && data.error) {
          throw new Error(data.error);
        } else {
          aiText = "Response received, but format was unexpected.";
          console.warn("Unexpected response format:", data);
        }

        console.log("Extracted AI text:", aiText);

        // Reload the entire chat history from the server
        // This ensures we have the latest messages including the one just sent
        const historyResponse = await fetch(`${API_BASE_URL}/api/chat/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          console.log("Reloaded chat history:", historyData);
          
          const formattedHistory = historyData.history.map((msg) => ({
            ...msg,
            id: crypto.randomUUID(),
          }));

          setMessages(formattedHistory);
        } else {
          // Fallback: if reload fails, just add the messages manually
          console.warn("Failed to reload history, adding messages manually");
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "user", text: prompt },
            { id: crypto.randomUUID(), role: "ai", text: aiText },
          ]);
        }

      } catch (error) {
        console.error("API call failed:", error);
        
        // Show error message
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "user", text: prompt },
          { 
            id: crypto.randomUUID(), 
            role: "ai", 
            text: `Sorry, an error occurred: ${error.message}`, 
            isError: true 
          },
        ]);
      } finally {
        setIsSending(false);
        console.log("fetchResponse completed, isSending set to false");
      }
    },
    [id, getToken, isSending]
  );

  // Handle first prompt from location state
  useEffect(() => {
    const { firstPrompt, mode, file } = location.state || {};

    if (firstPrompt && !hasProcessedFirstPrompt.current) {
      console.log("Processing first prompt:", firstPrompt);
      hasProcessedFirstPrompt.current = true;
      hasInitialized.current = true;
      
      setMessages([]);
      fetchResponse(firstPrompt, mode, file);
      
      // Clear location state to prevent re-processing
      navigate(location.pathname, { replace: true, state: {} });
    } else if (!firstPrompt && !hasInitialized.current) {
      console.log("Loading chat history for chat:", id);
      loadChatHistory();
    }
  }, [id, location.state, location.pathname, navigate, fetchResponse, loadChatHistory]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (isSending) {
      console.log("Already sending, button disabled");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const prompt = (formData.get("prompt") || "").toString().trim();

    if (!prompt) {
      console.log("Empty prompt, skipping");
      return;
    }

    console.log("Form submitted with prompt:", prompt);

    const hasYouTubeLink =
      YOUTUBE_URL_REGEX.test(prompt) || YOUTUBE_ID_REGEX.test(prompt);
    const mode = hasYouTubeLink ? "youtube" : "question";

    fetchResponse(prompt, mode);

    // Reset form
    formRef.current.reset();
    textareaRef.current.style.height = "auto";
    const container = formRef.current.querySelector(".input-container");
    if (container) {
      container.style.height = "auto";
    }
  };

  const handleInputResize = (e) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = `${textarea.scrollHeight}px`;
    textarea.style.height = newHeight;
    if (formRef.current) {
      const container = formRef.current.querySelector(".input-container");
      if (container) {
        container.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) {
        formRef.current.requestSubmit();
      }
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      fetchResponse(file.name, "document", file);
    }
    event.target.value = null;
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  if (isLoading) {
    return (
      <div className="chat-view">
        <div className="chat-loading-overlay">
          <div className="chat-loading-spinner"></div>
          <p className="chat-loading-text">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-view">
      <div className="messages-area">
        {messages.length === 0 && !isLoading && !isSending && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <h2 className="chat-empty-title">Start a conversation</h2>
            <p className="chat-empty-subtitle">
              Send a message to begin chatting
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message ${msg.role} ${msg.isError ? "error" : ""}`}
          >
            <pre>
              <code>{msg.text}</code>
            </pre>
          </div>
        ))}
        {isSending && messages.length > 0 && (
          <div className="message ai loading">
            <pre>
              <code>Thinking...</code>
            </pre>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <form
          ref={formRef}
          className="modern-input-wrapper"
          onSubmit={handleSendMessage}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            aria-hidden="true"
            accept=".pdf,.docx,.txt"
          />

          <div className="input-container">
            <button
              type="button"
              className="input-button upload-btn"
              aria-label="Upload file"
              onClick={handleUploadClick}
              disabled={isSending}
            >
              <ModernInputIcon type="upload" />
            </button>

            <div className="input-fields-container">
              <textarea
                ref={textareaRef}
                className="modern-input"
                name="prompt"
                placeholder="Ask anything, or paste a YouTube link..."
                autoComplete="off"
                rows="1"
                onInput={handleInputResize}
                onKeyDown={handleKeyDown}
                disabled={isSending}
              />
            </div>

            <button
              type="submit"
              className="input-button modern-submit-btn"
              aria-label="Submit"
              disabled={isSending}
            >
              <ModernInputIcon type="submit" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;