import { useNavigate } from "react-router-dom";
import "./dashboardPage.css";

const CardIcon = ({ type }) => {
  switch (type) {
    case "upload":
      return (<svg viewBox="0 0 24 24" className="card-icon"><path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/><path d="M4 16v4h16v-4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>);
    case "paste":
      return (<svg viewBox="0 0 24 24" className="card-icon"><rect x="8" y="7" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M10 4h4a2 2 0 012 2H8a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>);
    case "record":
      return (<svg viewBox="0 0 24 24" className="card-icon"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none"/><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/></svg>);
    default:
      return null;
  }
};

const DashboardPage = () => {
  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const q = (data.get("q") || "").toString().trim();
    const id = q ? encodeURIComponent(q.slice(0, 40).replace(/\s+/g, "-")) : "new-session";
    navigate(`/chat/${id}`);
  };

  return (
    <div className="learn-dashboard">
      <h2 className="page-title">What do you want to learn?</h2>

      <div className="action-cards">
        <button className="action-card">
          <CardIcon type="upload" />
          <div className="card-text">
            <div className="card-title">Upload</div>
            <div className="card-desc">File, audio, video</div>
          </div>
        </button>
        <button className="action-card">
          <CardIcon type="paste" />
          <div className="card-text">
            <div className="card-title">Paste</div>
            <div className="card-desc">YouTube, website, text</div>
          </div>
        </button>
        <button className="action-card">
          <CardIcon type="record" />
          <div className="card-text">
            <div className="card-title">Record</div>
            <div className="card-desc">Record class, video call</div>
          </div>
        </button>
      </div>

      <form className="main-input" onSubmit={onSubmit}>
        <input name="q" className="input-field" placeholder="Learn anything..." />
        <button className="submit-btn" aria-label="Start learning">
          <svg viewBox="0 0 24 24" className="submit-icon"><path d="M7 17l10-10M7 7h10v10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        </button>
      </form>
    </div>
  );
};

export default DashboardPage;
