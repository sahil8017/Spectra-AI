import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, RotateCcw, AlertCircle, ThumbsUp, ThumbsDown, Pencil, Trash2, Share2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './MessageBubble.css';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button className={`msg-action-btn ${copied ? 'copied' : ''}`} onClick={handle} title="Copy">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function CodeBlock({ className, children }) {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  if (!match) return <code className="inline-code">{children}</code>;
  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{lang}</span>
        <CopyBtn text={code} />
      </div>
      <SyntaxHighlighter style={oneDark} language={lang} PreTag="div"
        customStyle={{ margin: 0, fontSize: 13, lineHeight: 1.5, background: 'transparent', borderRadius: '0 0 8px 8px' }}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const FOLLOW_UPS = {
  default: ['Explain this further', 'Give me an example', 'Summarize this', 'What are the trade-offs?'],
};

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isLast, onRegenerate }) {
  const { likeMessage, editMessage, deleteMessage, currentConversationId, addToast, sendMessage } = useChat();
  const { id, role, content, error, metadata, timestamp, liked } = message;
  const isUser = role === 'user';
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(content);

  const handleLike = (val) => {
    likeMessage(currentConversationId, id, liked === val ? null : val);
    if (liked !== val) addToast(val === true ? 'Feedback noted — thanks!' : 'Feedback noted', 'success');
  };
  const handleEdit = () => { setEditText(content); setEditing(true); };
  const handleEditSave = () => { editMessage(currentConversationId, id, editText); setEditing(false); onRegenerate?.(); };
  const handleDelete = () => deleteMessage(currentConversationId, id);
  const handleShare = () => { navigator.clipboard.writeText(content); addToast('Response copied to clipboard', 'success'); };
  const handleFollowUp = (q) => sendMessage(q, currentConversationId);

  const formattedUser = isUser
    ? content.split(/(\*\*.*?\*\*)/).map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p
    )
    : null;

  return (
    <div className={`message-row ${role}`}>
      <div className="message-inner">
        <div className="message-content-wrapper">

          {editing ? (
            <div className="message-edit-box">
              <textarea className="message-edit-textarea" value={editText} onChange={e => setEditText(e.target.value)} rows={3} autoFocus />
              <div className="message-edit-actions">
                <button className="btn-primary" style={{ fontSize: 12, padding: '5px 14px' }} onClick={handleEditSave}>Save & Regenerate</button>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="message-bubble">
              {isUser ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>{formattedUser}</div>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
                    {content || (error ? '' : '…')}
                  </ReactMarkdown>
                </div>
              )}
              {error && (
                <div className="message-error">
                  <AlertCircle size={15} /> {error}
                  <button className="btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={onRegenerate}>Retry</button>
                </div>
              )}
              {metadata?.sources?.length > 0 && (
                <div className="sources-container">
                  <div className="sources-title">Sources</div>
                  <div className="source-pills">
                    {metadata.sources.map((s, i) => (
                      <div key={i} className="source-pill">Page {s.page || '?'}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata + actions row */}
          <div className="message-meta-row">
            <span className="message-time">{formatTime(timestamp)}</span>
            <div className="message-actions">
              {isUser ? (
                <>
                  <button className="msg-action-btn" title="Edit" onClick={handleEdit}><Pencil size={13} /></button>
                </>
              ) : (
                <>
                  {content && <CopyBtn text={content} />}
                  <button className={`msg-action-btn ${liked === true ? 'liked' : ''}`} title="Good response" onClick={() => handleLike(true)}><ThumbsUp size={13} /></button>
                  <button className={`msg-action-btn ${liked === false ? 'disliked' : ''}`} title="Bad response" onClick={() => handleLike(false)}><ThumbsDown size={13} /></button>
                  {isLast && <button className="msg-action-btn" title="Regenerate" onClick={onRegenerate}><RotateCcw size={13} /></button>}
                  <button className="msg-action-btn" title="Share" onClick={handleShare}><Share2 size={13} /></button>
                </>
              )}
            </div>
          </div>

          {/* Follow-up suggestions (only last AI message) */}
          {!isUser && isLast && content && !error && (
            <div className="follow-up-chips">
              {FOLLOW_UPS.default.map((q, i) => (
                <button key={i} className="follow-up-chip" onClick={() => handleFollowUp(q)}>{q}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
