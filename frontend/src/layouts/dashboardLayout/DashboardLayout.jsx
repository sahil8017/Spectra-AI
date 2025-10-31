import { useState, useRef, useEffect, useMemo } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  Navigate,
  Link,
} from "react-router-dom";
import { UserButton, useAuth } from "@clerk/clerk-react";
import "./dashboardLayout.css";

import { AnimatePresence } from "framer-motion";
import PageTransition from "../../components/PageTransition/PageTransition";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";

// --- ICONS ---
const HamburgerIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 6H20M4 12H20M4 18H20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="sidebar-icon"
  >
    <path d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
  </svg>
);

const NewChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="sidebar-icon"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="7" y1="9" x2="17" y2="9" />
    <line x1="7" y1="13" x2="14" y2="13" />
  </svg>
);

// --- SIDEBAR COMPONENT ---
const Sidebar = ({ isExpanded, onToggle, recentChats }) => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const { pathname } = useLocation();

  const activeChatId = useMemo(() => {
    const parts = pathname.split("/");
    return parts.length === 4 && parts[2] === "chats"
      ? decodeURIComponent(parts[3])
      : null;
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        navigate("/dashboard");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="logo-container">
          <img src="/logo.png" alt="logo" className="logo-img" />
        </Link>
        <button className="sidebar-toggle-button" onClick={onToggle}>
          <HamburgerIcon />
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          className="sidebar-new-chat-button"
          onClick={() => navigate("/dashboard")}
        >
          <NewChatIcon />
          <span className="sidebar-text">New Chat</span>
          <span className="sidebar-shortcut shortcut-on-hover">
            Ctrl+Shift+O
          </span>
        </button>

        <div className="sidebar-search-chat">
          <SearchIcon />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search chats"
            className="sidebar-text"
          />
          <span className="sidebar-shortcut shortcut-on-hover">Ctrl+K</span>
        </div>

        <div className="recent-chats-list">
          <h3 className="recent-chats-title">Recent Chats</h3>
          <ul>
            {/* Render chats from state */}
            {recentChats.map((chat) => (
              <li key={chat.id}>
                <Link
                  to={`/dashboard/chats/${encodeURIComponent(chat.id)}`}
                  className={`nav-link ${
                    activeChatId === chat.id ? "active" : ""
                  }`}
                >
                  <span className="nav-text">{chat.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="sidebar-footer">
        <UserButton afterSignOutUrl="/" />
        <ThemeToggle />
      </div>
    </aside>
  );
};

// --- DASHBOARD LAYOUT COMPONENT ---
const DashboardLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // --- MODIFIED: Load chats from localStorage on initial render ---
  const [recentChats, setRecentChats] = useState(() => {
    const savedChats = localStorage.getItem("spECTRA_recentChats");
    return savedChats ? JSON.parse(savedChats) : [];
  });

  // --- NEW: Save chats to localStorage whenever they change ---
  useEffect(() => {
    localStorage.setItem("spECTRA_recentChats", JSON.stringify(recentChats));
  }, [recentChats]);

  const handleCreateChat = (prompt, mode, file = null) => {
    const title = file
      ? file.name
      : prompt.length > 25
      ? prompt.slice(0, 25) + "..."
      : prompt;

    // --- MODIFIED: Use crypto.randomUUID() for a reliable unique ID ---
    const newChatId = crypto.randomUUID();
    const newChat = {
      id: newChatId,
      title: title,
    };

    // Add to recent chats list (newest first)
    setRecentChats((prevChats) => [newChat, ...prevChats]);

    // Navigate to the new chat page and pass all info in the state
    navigate(`/dashboard/chats/${newChatId}`, {
      state: {
        firstPrompt: prompt,
        mode: mode,
        file: file,
      },
    });
  };

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return (
    <div
      className={`dashboard-shell ${isSidebarExpanded ? "expanded" : "collapsed"}`}
    >
      {!isSidebarExpanded && (
        <button
          className="sidebar-open-button"
          style={{ position: 'fixed', top: 16, left: 16, zIndex: 1200 }}
          onClick={() => setIsSidebarExpanded(true)}
          aria-label="Open sidebar"
        >
          <HamburgerIcon />
        </button>
      )}
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(prev => !prev)}
        recentChats={recentChats}
      />
      <div className="content-wrapper">
        <main className="main-content">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet context={{ handleCreateChat }} />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;