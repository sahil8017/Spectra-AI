import { useEffect, useRef, useState } from "react";
import "./newPrompt.css";

// Copied from DashboardPage.jsx for consistency
const ModernInputIcon = ({ type }) => {
  const paths = {
    upload: "M12 5v14m-7-7h14",
    submit: "M12 5v14M12 5l-5 5M12 5l5 5",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className={`input-icon icon-${type}`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[type]} />
    </svg>
  );
};

const NewPrompt = ({ onSend, isLoading, isSending }) => {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [text, isSending, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || isSending || isLoading) return;

    onSend(text);
    setText("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInputResize = (e) => {
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
    setText(target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onSend(file.name, file); 
      e.target.value = null;
    }
  };

  return (
    <>
      <div className="endChat" ref={endRef}></div>

      {/* Wrapper form handles positioning */}
      <form className="newForm" onSubmit={handleSubmit}>
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }} 
          accept=".pdf,.docx,.txt"
          disabled={isSending || isLoading}
        />

        {/* The Modern Input Container (Matches Dashboard) */}
        <div className="input-container">
          {/* Upload Button */}
          <button 
            type="button" 
            className="input-button upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isLoading}
          >
            <ModernInputIcon type="upload" />
          </button>

          {/* Text Area */}
          <div className="input-fields-container">
            <textarea
              ref={textareaRef}
              className="modern-input"
              placeholder={isLoading ? "Loading..." : "Ask anything..."}
              value={text}
              onInput={handleInputResize}
              onKeyDown={handleKeyDown}
              rows="1"
              disabled={isSending || isLoading}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="input-button modern-submit-btn"
            disabled={isSending || isLoading || !text.trim()}
          >
            <ModernInputIcon type="submit" />
          </button>
        </div>
      </form>
    </>
  );
};

export default NewPrompt;