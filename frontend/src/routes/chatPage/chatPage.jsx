import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useParams,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import "./chatPage.css";

// The base URL of your Flask API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

// Regex to detect YouTube URLs
const YOUTUBE_URL_REGEX =
  /(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;
// Also support raw 11-char video IDs (e.g., "UQOTNkq0X48")
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

// SVG Icon component
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

// Main Chat Page Component
const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { handleCreateChat } = useOutletContext(); // Still needed for new file uploads

  // Helper function to update the "Thinking..." message
  const updateLastMessage = (text) => {
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1 ? { ...msg, text: text } : msg
      )
    );
  };

  const fetchResponse = useCallback(async (prompt, mode, file = null) => {
    const userMessage = { id: crypto.randomUUID(), role: "user", text: prompt };
    const aiResponse = {
      id: crypto.randomUUID(),
      role: "ai",
      text: "Thinking...",
    };
    setMessages((prev) => [...prev, userMessage, aiResponse]);

    try {
      let response;
      if (mode === "document" && file) {
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch(`${API_BASE_URL}/api/summarize-document`, {
          method: "POST",
          body: formData,
        });
      } else if (mode === "youtube") {
        let youtubeUrl = null;
        const urlMatch = prompt.match(YOUTUBE_URL_REGEX);
        if (urlMatch) {
          youtubeUrl = urlMatch[0];
        } else if (YOUTUBE_ID_REGEX.test(prompt)) {
          // Accept bare IDs by converting to short URL
          youtubeUrl = `https://youtu.be/${prompt}`;
        } else {
          throw new Error("Couldn't detect a valid YouTube URL or ID in your message.");
        }
        const userPrompt = prompt.replace(youtubeUrl, "").trim();

        response = await fetch(`${API_BASE_URL}/api/summarize-youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtube_url: youtubeUrl,
            prompt: userPrompt,
          }),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt }),
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "An unknown API error occurred.");
      }

      const data = await response.json();
      if (data && typeof data.summary === "string" && data.summary.length > 0) {
        updateLastMessage(data.summary);
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("Unexpected response format from the server.");
      }
    } catch (error) {
      console.error("API call failed:", error);
      updateLastMessage(`Sorry, an error occurred: ${error.message}`);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const { firstPrompt, mode, file } = location.state || {};
    if (firstPrompt) {
      setMessages([]); // always start empty, actual fetchResponse will append messages
      fetchResponse(firstPrompt, mode, file);
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      setMessages([]); // never show the fake welcome message
    }
  }, [id, location.state, navigate, location.pathname, fetchResponse]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const prompt = (formData.get("prompt") || "").toString().trim();

    if (!prompt) return;

    const hasYouTubeLink = YOUTUBE_URL_REGEX.test(prompt);
    const mode = hasYouTubeLink ? "youtube" : "question";

    fetchResponse(prompt, mode);

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
      formRef.current.requestSubmit();
    }
  };

  // --- THIS FUNCTION IS MODIFIED ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // This now adds the document to the CURRENT chat
      // instead of creating a new one.
      fetchResponse(file.name, "document", file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="chat-view">
      <div className="messages-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <pre>
              <code>{msg.text}</code>
            </pre>
          </div>
        ))}
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
            accept=".pdf,.docx"
          />

          <div className="input-container">
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
                ref={textareaRef}
                className="modern-input"
                name="prompt"
                placeholder="Ask anything, or paste a YouTube link..."
                autoComplete="off"
                rows="1"
                onInput={handleInputResize}
                onKeyDown={handleKeyDown}
              />
            </div>

            <button
              type="submit"
              className="input-button modern-submit-btn"
              aria-label="Submit"
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