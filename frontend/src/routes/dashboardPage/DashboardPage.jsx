import { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import "./dashboardPage.css";

const YOUTUBE_URL_REGEX =
  /(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const data = new FormData(e.currentTarget);
    const prompt = (data.get("prompt") || "").toString().trim();
    
    if (!prompt) return;

    setIsSubmitting(true);

    try {
      const hasYouTubeLink = YOUTUBE_URL_REGEX.test(prompt);
      const mode = hasYouTubeLink ? "youtube" : "question";

      await handleCreateChat(prompt, mode);
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Failed to create chat. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await handleCreateChat(file.name, "document", file);
      } catch (error) {
        console.error("Error uploading file:", error);
        alert("Failed to upload file. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
    event.target.value = null;
  };

  const handleUploadClick = () => {
    if (!isSubmitting) {
      fileInputRef.current.click();
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
    if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
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
            disabled={isSubmitting}
          />

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
                disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                className="input-button modern-submit-btn"
                aria-label="Submit"
                disabled={isSubmitting}
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