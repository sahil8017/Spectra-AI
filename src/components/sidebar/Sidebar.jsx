import "./sidebar.css";

const Sidebar = ({ isExpanded, setIsExpanded }) => {
  // Placeholder for recent chats - you will make this dynamic later
  const recentChats = ["My first chat", "React project ideas", "History of India"];

  return (
    <aside className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
      {/* Top Section: Hamburger and Logo */}
      <div className="sidebar-header">
        <button className="icon-button" onClick={() => setIsExpanded(!isExpanded)}>
          <img src="/hamburger-icon.png" alt="Toggle Menu" />
        </button>
        {isExpanded && <img src="/logo.png" alt="Logo" className="logo" />}
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <a href="#" className="nav-item new-chat-btn">
          <img src="/new-chat-icon.png" alt="New Chat" />
          {isExpanded && <span>New Chat</span>}
        </a>

        {isExpanded && (
          <>
            <div className="search-box">
              <img src="/search-icon.png" alt="Search" />
              <input type="text" placeholder="Search Chat" />
            </div>

            <span className="nav-title">Recent Chats</span>
            <div className="recent-chats-list">
              {recentChats.map((chat, index) => (
                <a href="#" key={index} className="nav-item">
                  <span>{chat}</span>
                </a>
              ))}
            </div>
            <a href="#" className="nav-item">All Previous</a>
          </>
        )}
      </nav>

      {/* Bottom Section: Settings */}
      <div className="sidebar-footer">
        <a href="#" className="nav-item">
          <img src="/settings-icon.png" alt="Settings" />
          {isExpanded && <span>Settings</span>}
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;