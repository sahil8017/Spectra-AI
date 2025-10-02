import { Link } from "react-router-dom";
import "./homepage.css";
import { TypeAnimation } from "react-type-animation";
import React, { useState, useEffect } from "react";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

const Homepage = () => {
  const [typingStatus, setTypingStatus] = useState("bot");
  const [isLoaded, setIsLoaded] = useState(false);
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`homepage ${isLoaded ? "loaded" : ""}`}>
      <img src="/orbital.png" alt="Orbital background" className="orbital" />

      <div className="left">
        <h1 className="brand">spECTRA</h1>

        <h2 className="tagline">Summarize YouTube. Smarter. Faster.</h2>
        <p className="subtext">
          Skip the fluff, capture the essence. spECTRA turns hours of YouTube into
          <span className="highlight"> sharp, AI-powered insights</span> — so
          you learn more in less time.
        </p>
        {hasClerk ? (
          <>
            <SignedIn>
              <Link to="/dashboard" className="cta">Get Started</Link>
            </SignedIn>
            <SignedOut>
              <Link to="/sign-in" className="cta">Get Started</Link>
            </SignedOut>
          </>
        ) : (
          <Link to="/sign-in" className="cta">Get Started</Link>
        )}
      </div>

      <div className="right">
        <div className="imgContainer">
          <div className="bgContainer">
            <div className="bg"></div>
          </div>
          <img src="/bot.png" alt="AI Bot" className="bot" />
          <div className="chat">
            <img
              src={
                typingStatus === "human1"
                  ? "/human1.jpeg"
                  : typingStatus === "human2"
                  ? "/human2.jpeg"
                  : "/bot.png"
              }
              alt="Chat avatar"
            />
            <TypeAnimation
              sequence={[
                "Welcome to SPECTRA! Paste a YouTube link to get started.",
                2000,
                () => setTypingStatus("human1"),
                "Save time and learn more with spECTRA's smart summaries.",
                2000,
                () => setTypingStatus("bot"),
                "SPECTRA uses advanced AI to summarize videos quickly.",
                2000,
                () => setTypingStatus("human2"),
                "Try it out now and see the magic!",
                2000,
                () => setTypingStatus("bot"),
              ]}
              wrapper="span"
              speed={50}
              className="chat-text"
              repeat={Infinity}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;