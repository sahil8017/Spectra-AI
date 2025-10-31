import { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import "./dashboardPage.css";

// Regex to detect YouTube URLs
const YOUTUBE_URL_REGEX =
  /(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;

// Icon component
const ModernInputIcon = ({ type }) => {
  const paths = {
    upload: "M12 5v14m-7-7h14",
    submit: "M12 5v14M12 5l-5 5M12 5l5 5",
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

const DashboardPage = () => {
  const { user } = useUser();
  const { handleCreateChat } = useOutletContext();
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const textareaRef = useRef(null);

  // Animation variants (unchanged)
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 260, damping: 20, mass: 0.8 },
    },
  };

  // --- THIS IS THE FIXED SUBMIT LOGIC ---
  const onSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const prompt = (data.get("prompt") || "").toString().trim(); // Gets "prompt"
    if (!prompt) return;

    // Check if the prompt contains a YouTube link
    const hasYouTubeLink = YOUTUBE_URL_REGEX.test(prompt);
    const mode = hasYouTubeLink ? "youtube" : "question";

    // Call the layout function with the prompt and the detected mode
    handleCreateChat(prompt, mode);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleCreateChat(file.name, "document", file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
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

  return (
    <motion.div
      className="learn-dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 className="page-title" variants={itemVariants}>
        Hello, {user?.firstName || ""}
      </motion.h2>

      <motion.div className="synced-content" variants={itemVariants}>
        <p className="page-subtitle">What do you want to learn?</p>

        <div className="form-container">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept=".pdf,.docx"
          />

          {/* --- THIS IS THE FIXED FORM --- */}
          <form
            ref={formRef}
            className="modern-input-wrapper"
            onSubmit={onSubmit}
          >
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
                  name="prompt" // Name is "prompt"
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
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;