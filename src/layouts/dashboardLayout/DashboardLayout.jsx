import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./dashboardLayout.css";

// A simple Icon component for SVG paths
const Icon = ({ path }) => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d={path} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- SIDEBAR COMPONENT ---
const Sidebar = ({ isExpanded, onToggle }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // This will be dynamic later
  const recentChats = [
    { id: "1", title: "My first chat" },
    { id: "2", title: "React project ideas" },
    { id: "3", title: "History of India" },
  ];

  const activeChatId = useMemo(() => {
    const parts = pathname.split("/");
    return parts[1] === "chat" ? decodeURIComponent(parts[2] || "") : "";
  }, [pathname]);

  return (
    <aside className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
      {/* Header with Toggle and Logo */}
      <div className="sidebar-header">
        <button className="icon-button" onClick={onToggle} aria-label="Toggle sidebar">
          <Icon path="M3 6h18M3 12h18M3 18h18" />
        </button>
        <span className="brand-label">LAMA AI</span>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <button className="nav-link new-chat" onClick={() => navigate("/chat/new-session")}>
          <Icon path="M12 5v14m-7-7h14" />
          <span className="nav-text">New Chat</span>
        </button>

        {/* Expanded View Content */}
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
                  <button className={`nav-link ${activeChatId === c.id ? "active" : ""}`} onClick={() => navigate(`/chat/${encodeURIComponent(c.id)}`)}>
                    <span className="nav-text">{c.title}</span>
                  </button>
                </li>
              ))}
              <li>
                <button className="nav-link all-previous">
                  <span className="nav-text">All Previous</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Footer with Settings */}
      <div className="sidebar-footer">
        <button className="nav-link" onClick={() => navigate("/settings")}>
          <Icon path="M19.14,12.94a4,4,0,0,0-4.48-4.48l-2.83-2.83a4,4,0,0,0-5.66,5.66l2.83,2.83a4,4,0,0,0,4.48,4.48l2.83,2.83a4,4,0,0,0,5.66-5.66Z" />
          <span className="nav-text">Settings</span>
        </button>
      </div>
    </aside>
  );
};


// --- DASHBOARD LAYOUT COMPONENT ---
const DashboardLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <div className={`dashboard-shell ${isSidebarExpanded ? "expanded" : "collapsed"}`}>
      <Sidebar isExpanded={isSidebarExpanded} onToggle={() => setIsSidebarExpanded((prev) => !prev)} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
