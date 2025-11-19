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

const Sidebar = ({ isExpanded, onToggle, recentChats, isLoading }) => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const { pathname } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const activeChatId = useMemo(() => {
    const parts = pathname.split("/");
    return parts.length === 4 && parts[2] === "chats"
      ? decodeURIComponent(parts[3])
      : null;
  }, [pathname]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return recentChats;
    return recentChats.filter((chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recentChats, searchQuery]);

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="sidebar-shortcut shortcut-on-hover">Ctrl+K</span>
        </div>

        <div className="recent-chats-list">
          <h3 className="recent-chats-title">Recent Chats</h3>
          
          {isLoading ? (
            <div className="sidebar-loading">
              <div className="sidebar-loading-spinner"></div>
              <p className="sidebar-loading-text">Loading chats...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="sidebar-empty">
              {searchQuery.trim() ? "No chats found" : "No chats yet. Start a conversation!"}
            </div>
          ) : (
            <ul>
              {filteredChats.map((chat) => (
                <li key={chat._id}>
                  <Link
                    to={`/dashboard/chats/${encodeURIComponent(chat._id)}`}
                    className={`nav-link ${
                      activeChatId === chat._id ? "active" : ""
                    }`}
                  >
                    <span className="nav-text">{chat.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <UserButton afterSignOutUrl="/" />
        <ThemeToggle />
      </div>
    </aside>
  );
};

const DashboardLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hasLoadedChats = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

  // Load chats from backend
  useEffect(() => {
    const loadChats = async () => {
      if (!isSignedIn || hasLoadedChats.current) return;
      
      hasLoadedChats.current = true;
      setIsLoadingChats(true);

      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/api/chats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setRecentChats(data.chats || []);
        }
      } catch (error) {
        console.error("Error loading chats:", error);
      } finally {
        setIsLoadingChats(false);
      }
    };

    if (isLoaded && isSignedIn) {
      loadChats();
    }
  }, [isSignedIn, isLoaded, getToken, API_BASE_URL]);

  const handleCreateChat = async (prompt, mode, file = null) => {
    const title = file
      ? file.name
      : prompt.length > 25
      ? prompt.slice(0, 25) + "..."
      : prompt;

    try {
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/api/create-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title,
          text: mode !== "document" ? prompt : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create chat on server");
      }

      const data = await response.json();
      const newChatId = data.chatId;

      const newChat = {
        _id: newChatId,
        title: title,
      };

      setRecentChats((prevChats) => [newChat, ...prevChats]);

      navigate(`/dashboard/chats/${newChatId}`, {
        state: {
          firstPrompt: mode !== "document" ? prompt : file.name,
          mode: mode,
          file: file,
        },
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Failed to create chat. Please try again.");
    }
  };

  if (!isLoaded) {
    return (
      <div className="dashboard-shell">
        <div className="chat-loading-overlay">
          <div className="chat-loading-spinner"></div>
          <p className="chat-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return (
    <div
      className={`dashboard-shell ${
        isSidebarExpanded ? "expanded" : "collapsed"
      }`}
    >
      {!isSidebarExpanded && (
        <button
          className="sidebar-open-button"
          onClick={() => setIsSidebarExpanded(true)}
          aria-label="Open sidebar"
        >
          <HamburgerIcon />
        </button>
      )}
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded((prev) => !prev)}
        recentChats={recentChats}
        isLoading={isLoadingChats}
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