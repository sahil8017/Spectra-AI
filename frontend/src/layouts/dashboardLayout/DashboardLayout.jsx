import { useState, useMemo } from "react";
import { Outlet, useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { UserButton, useAuth } from "@clerk/clerk-react";
import "./dashboardLayout.css";

import { AnimatePresence } from "framer-motion";
import PageTransition from "../../components/PageTransition/PageTransition";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";

// --- ICONS ---
const Icon = ({ path }) => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d={path} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


// --- SIDEBAR COMPONENT ---
const Sidebar = ({ closeSidebar }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const recentChats = useMemo(() => [
    { id: "my-first-chat", title: "My first chat" },
    { id: "react-project-ideas", title: "React project ideas" },
    { id: "history-of-india", title: "History of India" },
  ], []);

  const activeChatId = useMemo(() => {
    const parts = pathname.split("/");
    return parts.length === 4 && parts[2] === "chats" ? decodeURIComponent(parts[3]) : null;
  }, [pathname]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {/* --- ORDER SWAPPED HERE --- */}
        {/* 1. Logo is now first */}
        <Link to="/" className="logo-container">
          <img src="/logo.png" alt="logo" className="logo-img" />
          <span className="brand-label">spECTRA</span>
        </Link>
        {/* 2. Button is now second */}
        <button className="sidebar-toggle-button" onClick={closeSidebar}>
          <HamburgerIcon />
        </button>
      </div>

      <nav className="sidebar-nav">
        <button className="nav-link new-chat" onClick={() => navigate("/dashboard")}>
          <Icon path="M12 5v14m-7-7h14" />
          <span className="nav-text">New Chat</span>
        </button>
        
        <div className="expanded-content">
          <div className="search-box">
            <Icon path="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            <input type="text" placeholder="Search Chat" />
          </div>

          <div className="nav-section">
            <h3 className="section-title">Recent Chats</h3>
            <ul>
              {recentChats.map((c) => (
                <li key={c.id}>
                  <button
                    className={`nav-link ${activeChatId === c.id ? "active" : ""}`}
                    onClick={() => navigate(`/dashboard/chats/${encodeURIComponent(c.id)}`)}
                  >
                    <span className="nav-text">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
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

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return (
    <div className={`dashboard-shell ${isSidebarExpanded ? "expanded" : "collapsed"}`}>
      <Sidebar closeSidebar={() => setIsSidebarExpanded(false)} />

      <div className="content-wrapper">
        {!isSidebarExpanded && (
            <button 
              className="sidebar-open-button"
              onClick={() => setIsSidebarExpanded(true)}
              aria-label="Open sidebar"
            >
              <HamburgerIcon />
            </button>
        )}

        <main className="main-content">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;