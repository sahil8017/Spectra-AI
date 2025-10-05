import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import "./dashboardPage.css";

// Icon component
const ModernInputIcon = ({ type }) => {
  const paths = {
    switcher: "M13 10V3L4 14h7v7l9-11h-7z",
    youtube: "M12.2,12.4c-0.6,0-1,0.5-1,1s0.5,1,1,1s1-0.5,1-1S12.7,12.4,12.2,12.4z M17.9,12.1c-0.2-0.8-0.9-1.5-1.7-1.7 c-1.5-0.4-3.9-0.4-5.4,0C10,10.6,9.3,11.3,9.1,12.1c-0.2,1.2-0.2,3.7,0,4.9c0.2,0.8,0.9,1.5,1.7,1.7c1.5,0.4,3.9,0.4,5.4,0 c0.8-0.2,1.5-0.9,1.7-1.7C18.1,15.8,18.1,13.3,17.9,12.1z",
    upload: "M12 5v14m-7-7h14",
    submit: "M12 5l0 14",
  };
  const path = type === 'submit' ? "M12 5v14M12 5l-5 5M12 5l5 5" : paths[type];
  return (
    <svg viewBox="0 0 24 24" className={`input-icon icon-${type}`} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState('question');
  const { user } = useUser();

  // Container controls the sequence timing
  const containerVariants = {
    hidden: { opacity: 1 }, // Keep opacity at 1 since PageTransition handles fade
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15, // Faster stagger for snappier feel
        delayChildren: 0.1, // Small delay to let page fade in first
      },
    },
  };

  // Items slide up with scale for a polished effect
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 260,
        damping: 20,
        mass: 0.8
      },
    },
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const q = (data.get(inputMode) || "").toString().trim();
    if (!q) return;
    const id = encodeURIComponent(q.slice(0, 40).replace(/\s+/g, "-"));
    navigate(`/dashboard/chats/${id}`);
  };

  return (
    <motion.div
      className="learn-dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Title animates first */}
      <motion.h2 className="page-title" variants={itemVariants}>
        Hello, {user?.firstName || ''}
      </motion.h2>

      {/* Subtitle and form animate together as second item */}
      <motion.div className="synced-content" variants={itemVariants}>
        <p className="page-subtitle">
          What do you want to learn?
        </p>

        <div className="form-container">
          <form className={`modern-input-wrapper ${inputMode}`} onSubmit={onSubmit}>
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
                <input
                  key="question-input"
                  className="modern-input"
                  name="question"
                  placeholder="Ask anything..."
                  autoComplete="off"
                />
                <input
                  key="youtube-input"
                  className="modern-input"
                  name="youtube"
                  placeholder="Paste a YouTube video link..."
                  autoComplete="off"
                />
              </div>
              <button className="input-button modern-submit-btn" aria-label="Submit">
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