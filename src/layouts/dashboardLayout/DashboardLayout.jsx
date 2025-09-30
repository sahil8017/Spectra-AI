import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./dashboardLayout.css";
import mockChats from "../../data/mockChats";

const Icon = ({ name }) => {
  switch (name) {
    case "hamburger":
      return (<svg viewBox="0 0 24 24" className="icon"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>);
    case "search":
      return (<svg viewBox="0 0 24 24" className="icon"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>);
    case "history":
      return (<svg viewBox="0 0 24 24" className="icon"><path d="M3 12a9 9 0 1 0 3-6.708" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M3 3v6h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>);
    case "chat":
      return (<svg viewBox="0 0 24 24" className="icon"><path d="M4 5h16v10H8l-4 4z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>);
    case "gear":
      return (<svg viewBox="0 0 24 24" className="icon"><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M2 12h3M19 12h3M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" stroke="currentColor" strokeWidth="2" fill="none" /></svg>);
    default:
      return null;
  }
};

const Sidebar = ({ expanded, onToggle }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const recentChats = mockChats;

  const activeChatId = useMemo(() => {
    const parts = pathname.split("/");
    return parts[1] === "chat" ? decodeURIComponent(parts[2] || "") : "";
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark-mode");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <aside className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <div className="sidebar-header">
        <button className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
          <Icon name="hamburger" />
        </button>
        <span className="brand-label">YouLearn</span>
      </div>

      <nav className="nav-section">
        <ul>
          <li>
            <button className="nav-link" onClick={() => navigate("/dashboard")}>
              <Icon name="search" />
              <span>Search</span>
            </button>
          </li>
          <li>
            <button className="nav-link" onClick={() => navigate("/chat/history")}>
              <Icon name="history" />
              <span>History</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="section-title">Recent Chats</div>
      <nav className="nav-section">
        <ul>
          {recentChats.map((c) => (
            <li key={c.id}>
              <button className={`nav-link ${activeChatId === c.id ? "active" : ""}`} onClick={() => navigate(`/chat/${encodeURIComponent(c.id)}`)}>
                <Icon name="chat" />
                <span>{c.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="section-title">Help & Tools</div>
      <nav className="nav-section">
        <ul>
          <li><button className="nav-link" onClick={() => navigate("/chat/feedback")}><Icon name="chat" /><span>Feedback</span></button></li>
          <li><button className="nav-link" onClick={() => navigate("/chat/guide")}><Icon name="chat" /><span>Quick Guide</span></button></li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="user-settings" onClick={() => setMenuOpen((v) => !v)}>
          <span className="avatar" aria-hidden="true">SG</span>
          <span className="user-label">SAHIL GUPTA</span>
        </button>
        {menuOpen && (
          <div className="settings-menu" role="menu">
            <button className="menu-item" onClick={() => navigate("/dashboard")}>
              <Icon name="gear" />
              <span>Settings</span>
            </button>
            <label className="menu-item toggle">
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              <span>Dark mode</span>
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};

const DashboardLayout = () => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`dashboard-shell ${expanded ? "expanded" : "collapsed"}`}>
      <Sidebar expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;