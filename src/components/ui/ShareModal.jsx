import { X, Link, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import './ShareModal.css';

export default function ShareModal({ isOpen, onClose, title }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-modal');
    } else {
      document.body.classList.remove('has-modal');
    }
    return () => document.body.classList.remove('has-modal');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="share-modal-overlay unselectable-ui" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2 className="share-modal-title">{title || 'Share Link'}</h2>
          <button className="share-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="share-modal-preview">
          <div className="preview-skeleton-title"></div>
          <div className="preview-skeleton-line"></div>
          <div className="preview-skeleton-line short"></div>
          <div className="preview-badge">SpectraAI</div>
        </div>

        <div className="share-modal-actions">
          <button className={`copy-link-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
            {copied ? <Check size={18} /> : <Link size={18} />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
