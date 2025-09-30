import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import "./dashboardLayout.css";

const Icon = ({ name }) => {
  // Minimal inline SVG icon set; styled via CSS classes
  switch (name) {
    case "toggle":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      );
    case "hamburger":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      );
    case "add":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" className="icon"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M3 12a9 9 0 1 0 3-6.708" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M3 3v6h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/><path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      );
    case "space":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M4 7h16v10H4z" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M4 10h16" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
      );
    case "feedback":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M4 5h16v12H7l-3 3z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
      );
    case "guide":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M5 4h9l5 5v11H5z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
      );
    case "ext":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M9 3h6v6H9zM5 15h6v6H5zM13 11h6v6h-6z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className="icon"><path d="M7 4c3-1 7-1 10 0 1.5 3 2.5 6 2 9-2 2-4 3-7 3s-5-1-7-3c-.5-3 .5-6 2-9" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
      );
    default:
      return null;
  }
};

const Sidebar = ({ expanded, onToggle }) => {
  const navigate = useNavigate();
  const go = (to) => () => navigate(to);

  return (
    <aside className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <div className="sidebar-header">
        <button className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
          <Icon name={expanded ? "toggle" : "hamburger"} />
        </button>
        <span className="brand-label">YouLearn</span>
      </div>

      <nav className="nav-section">
        <ul>
          <li><button className="nav-link" onClick={go("/dashboard")}>{<Icon name="add" />}<span>Add content</span></button></li>
          <li><button className="nav-link" onClick={go("/dashboard")}>{<Icon name="search" />}<span>Search</span></button></li>
          <li><button className="nav-link" onClick={go("/chat/history")}>{<Icon name="history" />}<span>History</span></button></li>
        </ul>
      </nav>

      <div className="section-title">Spaces</div>
      <nav className="nav-section">
        <ul>
          <li><button className="nav-link" onClick={go("/chat/create-space")}>{<Icon name="space" />}<span>Create Space</span></button></li>
          <li><button className="nav-link" onClick={go("/chat/untitled")}>{<Icon name="space" />}<span>Untitled Space</span></button></li>
          <li><button className="nav-link" onClick={go("/chat/sahil-space")}>{<Icon name="space" />}<span>Sahil's Space</span></button></li>
        </ul>
      </nav>

      <div className="section-title">Help & Tools</div>
      <nav className="nav-section">
        <ul>
          <li><button className="nav-link" onClick={go("/chat/feedback")}>{<Icon name="feedback" />}<span>Feedback</span></button></li>
          <li><button className="nav-link" onClick={go("/chat/guide")}>{<Icon name="guide" />}<span>Quick Guide</span></button></li>
          <li><button className="nav-link" onClick={go("/chat/extension")}>{<Icon name="ext" />}<span>Chrome Extension</span></button></li>
          <li><button className="nav-link" onClick={go("/chat/discord")}>{<Icon name="discord" />}<span>Discord Server</span></button></li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-name">Sahil Gupta</div>
        <div className="user-plan">Free Plan</div>
      </div>
    </aside>
  );
};

const DashboardLayout = () => {
  const [expanded, setExpanded] = useState(true);
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
