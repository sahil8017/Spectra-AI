import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import { UserButton, useAuth } from "@clerk/clerk-react";
import "./dashboardLayout.css";

import { AnimatePresence } from "framer-motion";
import PageTransition from "../../components/PageTransition/PageTransition";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";

// --- ICONS ---
const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
  </svg>
);

const NewChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="7" y1="9" x2="17" y2="9" />
    <line x1="7" y1="13" x2="14" y2="13" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ThreeDotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="19" cy="12" r="1"></circle>
    <circle cx="5" cy="12" r="1"></circle>
  </svg>
);

// --- SIDEBAR COMPONENT ---
const Sidebar = ({ isExpanded, onToggle, recentChats, isLoading, onDeleteChat, onDeleteAllChats }) => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const { pathname } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for Dropdown Menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl + K: Focus Search
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!isExpanded) onToggle(); 
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Ctrl + Shift + O: New Chat
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        navigate("/dashboard");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isExpanded, onToggle]);

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
        <button className="sidebar-new-chat-button" onClick={() => navigate("/dashboard")}>
          <NewChatIcon />
          <span className="sidebar-text">New Chat</span>
          <span className="sidebar-shortcut shortcut-on-hover">Ctrl+Shift+O</span>
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
          {/* NEW HEADER WITH 3 DOTS */}
          <div className="recent-chats-header" ref={menuRef}>
            <h3 className="recent-chats-title">Recent Chats</h3>
            <button 
              className={`three-dots-btn ${isMenuOpen ? 'active' : ''}`} 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <ThreeDotsIcon />
            </button>

            {/* DROPDOWN MENU */}
            {isMenuOpen && (
              <div className="chat-options-dropdown">
                 <button 
                  className="dropdown-item danger"
                  onClick={() => {
                    if(window.confirm("Are you sure you want to delete ALL chats? This cannot be undone.")) {
                        onDeleteAllChats();
                        setIsMenuOpen(false);
                    }
                  }}
                 >
                   <TrashIcon /> Clear All Chats
                 </button>
              </div>
            )}
          </div>
          
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
                    className={`nav-link ${activeChatId === chat._id ? "active" : ""}`}
                  >
                    <span className="nav-text">{chat.title}</span>
                    
                    {/* DELETE SINGLE CHAT BUTTON */}
                    <button 
                      className="delete-chat-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        onDeleteChat(chat._id);
                      }}
                      title="Delete Chat"
                    >
                      <TrashIcon />
                    </button>
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

// --- DASHBOARD LAYOUT COMPONENT ---
const DashboardLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  
  // Undo Logic State
  const [deletedChatStack, setDeletedChatStack] = useState([]); 
  const undoTimeoutRef = useRef(null);

  const { isSignedIn, isLoaded, getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hasLoadedChats = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

  // 1. Load Chats
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

  // 2. Create Chat Handler
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
        body: JSON.stringify({ title: title, text: null }),
      });

      if (!response.ok) throw new Error("Failed to create chat");

      const data = await response.json();
      const newChat = { _id: data.chatId, title: title };

      setRecentChats((prev) => [newChat, ...prev]);

      navigate(`/dashboard/chats/${data.chatId}`, {
        state: {
          firstPrompt: mode !== "document" ? prompt : file.name,
          mode: mode,
          file: file,
        },
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Failed to create chat.");
    }
  };

  // 3. Delete Single Chat Handler
  const handleDeleteChat = useCallback((chatId) => {
    const chatToDelete = recentChats.find(c => c._id === chatId);
    if (!chatToDelete) return;

    setRecentChats(prev => prev.filter(c => c._id !== chatId));
    setDeletedChatStack(prev => [...prev, chatToDelete]);

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    
    undoTimeoutRef.current = setTimeout(async () => {
      try {
        const token = await getToken();
        await fetch(`${API_BASE_URL}/api/chat/${chatId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        setDeletedChatStack(prev => prev.filter(c => c._id !== chatId));
      } catch (err) {
        console.error("Failed to delete chat", err);
        setRecentChats(prev => [chatToDelete, ...prev]); 
      }
    }, 5000);

    if (location.pathname.includes(chatId)) {
        navigate("/dashboard");
    }

  }, [recentChats, getToken, API_BASE_URL, location.pathname, navigate]);


  // 4. Delete ALL Chats Handler (NEW)
  const handleDeleteAllChats = useCallback(async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/api/chats`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if(response.ok) {
            setRecentChats([]); // Clear UI immediately
            navigate("/dashboard"); // Go to empty dashboard
        }
      } catch (error) {
          console.error("Failed to delete all chats", error);
          alert("Failed to clear history.");
      }
  }, [getToken, API_BASE_URL, navigate]);


  // 5. Undo Handler
  const handleUndo = useCallback(() => {
    if (deletedChatStack.length === 0) return;

    const chatToRestore = deletedChatStack[deletedChatStack.length - 1];
    
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
    }

    setRecentChats(prev => [chatToRestore, ...prev]); 
    setDeletedChatStack(prev => prev.slice(0, -1));

  }, [deletedChatStack]);


  // 6. Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeys = (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            const parts = location.pathname.split('/');
            if (parts[2] === 'chats' && parts[3]) {
                handleDeleteChat(parts[3]);
            }
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            handleUndo();
        }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [location.pathname, handleDeleteChat, handleUndo]);


  if (!isLoaded) return <div className="dashboard-shell"><div className="chat-loading-overlay"><div className="chat-loading-spinner"></div></div></div>;
  // No need to check isSignedIn here because SignedIn wrapper handles it in main.jsx, 
  // but good for double safety inside hooks.

  return (
    <div className={`dashboard-shell ${isSidebarExpanded ? "expanded" : "collapsed"}`}>
      {!isSidebarExpanded && (
        <button className="sidebar-open-button" onClick={() => setIsSidebarExpanded(true)}>
          <HamburgerIcon />
        </button>
      )}
      
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(p => !p)}
        recentChats={recentChats}
        isLoading={isLoadingChats}
        onDeleteChat={handleDeleteChat}
        onDeleteAllChats={handleDeleteAllChats} // Pass the new handler
      />
      
      <div className="content-wrapper">
        <main className="main-content">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet context={{ handleCreateChat }} />
            </PageTransition>
          </AnimatePresence>
        </main>

        {/* UNDO TOAST */}
        <AnimatePresence>
            {deletedChatStack.length > 0 && (
                <div className="undo-toast">
                    <span>Chat deleted</span>
                    <button onClick={handleUndo} className="undo-btn">Undo (Ctrl+Z)</button>
                </div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default DashboardLayout;