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

const ExpandIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 11L8 12.5L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 11L16 12.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CollapseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M11 15L8 12L11 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="15.25" y1="9" x2="15.25" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// --- SIDEBAR COMPONENT ---
const Sidebar = () => {
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
        <Link to="/" className="logo">
          <img src="/logo.png" alt="logo" />
        </Link>
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
    </aside>
  );
};

// --- DASHBOARD LAYOUT COMPONENT ---
const DashboardLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Start collapsed
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return (
    <div className={`dashboard-shell ${isSidebarExpanded ? "expanded" : "collapsed"}`}>
      <Sidebar />

      <div className="content-wrapper">
        <header className="top-bar">
          <button 
            className="sidebar-toggle" 
            onClick={() => setIsSidebarExpanded((prev) => !prev)}
            data-tooltip={isSidebarExpanded ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarExpanded ? <CollapseIcon /> : <ExpandIcon />}
          </button>
          
          <Link to="/" className="brand-label">spECTRA</Link>
          
          <div className="top-bar-user">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

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
