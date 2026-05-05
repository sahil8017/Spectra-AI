import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, FileText, X, Loader2, Mic, ChevronUp, AlignLeft, Zap, BookOpen } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './ChatInput.css';

const PLACEHOLDERS = [
  'Ask anything…',
  'Paste a YouTube URL to summarize…',
  'Upload a PDF and ask questions…',
  'Try: /code, /summarize, /translate…',
  'What would you like to explore today?',
];

const LENGTH_ICONS = { concise: <Zap size={13}/>, balanced: <AlignLeft size={13}/>, detailed: <BookOpen size={13}/> };

export default function ChatInput({ onSendMessage, onFileUpload, isLoading, hasDoc }) {
  const { responseLengths, responseLength, setResponseLength, promptTemplates, addToast } = useChat();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [showLength, setShowLength] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const textRef = useRef(null);
  const fileRef = useRef(null);
  const wrapRef = useRef(null);

  // Rotate placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // File picker event
  useEffect(() => {
    const h = () => fileRef.current?.click();
    window.addEventListener('spectra:trigger-file-picker', h);
    return () => window.removeEventListener('spectra:trigger-file-picker', h);
  }, []);

  // Drag & drop
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') { setFile(f); addToast(`${f.name} ready to upload`, 'success'); }
    else addToast('Only PDF files supported', 'error');
  };

  const handleInput = (e) => {
    setText(e.target.value);
    e.target.style.height = '54px';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f?.type === 'application/pdf') { setFile(f); addToast(`${f.name} ready`, 'success'); }
    else if (f) addToast('Only PDF files are supported', 'error');
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if ((!text.trim() && !file) || isLoading) return;
    if (file) { await onFileUpload(file, text.trim()); setFile(null); }
    else { await onSendMessage(text.trim()); }
    setText('');
    if (textRef.current) textRef.current.style.height = '54px';
  };

  const injectTemplate = (template) => {
    setText(template);
    setShowTemplates(false);
    setTimeout(() => { textRef.current?.focus(); textRef.current?.setSelectionRange(template.length, template.length); }, 50);
  };

  const charCount = text.length;
  const placeholder = file ? 'Add a message to send with your document…' : hasDoc ? 'Ask about the uploaded document…' : PLACEHOLDERS[placeholderIdx];

  return (
    <div
      className={`chat-input-container ${dragOver ? 'drag-over' : ''}`}
      ref={wrapRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <Paperclip size={28} />
            <span>Drop PDF to upload</span>
          </div>
        </div>
      )}

      <div className="chat-input-wrapper">
        {/* Templates panel */}
        {showTemplates && (
          <div className="templates-panel">
            <div className="templates-header">
              <span>Prompt Templates</span>
              <button onClick={() => setShowTemplates(false)}><X size={14}/></button>
            </div>
            <div className="templates-grid">
              {promptTemplates.map(t => (
                <button key={t.id} className="template-chip" onClick={() => injectTemplate(t.template)}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File preview */}
        {file && (
          <div className="file-preview">
            <div className="file-preview-info">
              <div className="file-preview-icon"><FileText size={16}/></div>
              <span className="file-preview-name">{file.name}</span>
              <span style={{fontSize:11, color:'var(--text-muted)', marginLeft:4}}>({(file.size/1024/1024).toFixed(1)} MB)</span>
            </div>
            <button className="file-preview-close" onClick={() => setFile(null)} disabled={isLoading}><X size={14}/></button>
          </div>
        )}

        <div className="chat-input-box">
          <textarea
            ref={textRef}
            className="chat-textarea"
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
          />

          <div className="chat-input-actions">
            <div className="chat-input-tools">
              {/* Attach PDF */}
              <button className="chat-tool-btn" onClick={() => fileRef.current?.click()} disabled={isLoading || !!file} title="Attach PDF">
                <Paperclip size={17}/>
              </button>
              <input type="file" ref={fileRef} style={{display:'none'}} accept="application/pdf" onChange={handleFileChange}/>

              {/* Voice (hint only) */}
              <button className="chat-tool-btn" title="Voice input (coming soon)" onClick={() => addToast('Voice input coming soon!', 'info')}>
                <Mic size={17}/>
              </button>

              {/* Templates */}
              <button className={`chat-tool-btn ${showTemplates ? 'active' : ''}`} onClick={() => setShowTemplates(p => !p)} title="Prompt templates">
                <ChevronUp size={17}/>
              </button>

              {/* Length toggle */}
              <div style={{position:'relative'}}>
                <button className={`chat-tool-btn length-btn ${showLength ? 'active' : ''}`} onClick={() => setShowLength(p => !p)} title="Response length">
                  {LENGTH_ICONS[responseLength]}
                </button>
                {showLength && (
                  <div className="length-dropdown">
                    {responseLengths.map(r => (
                      <button key={r.id} className={`length-option ${r.id === responseLength ? 'active' : ''}`}
                        onClick={() => { setResponseLength(r.id); setShowLength(false); }}>
                        {LENGTH_ICONS[r.id]}
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{r.label}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {charCount > 0 && <span className="char-counter" style={{opacity: charCount > 3000 ? 1 : 0.5}}>{charCount}</span>}
              <button
                className={`chat-send-btn ${(text.trim() || file) && !isLoading ? 'active' : ''}`}
                onClick={handleSubmit}
                disabled={(!text.trim() && !file) || isLoading}
              >
                {isLoading ? <Loader2 size={16} className="spinner"/> : <Send size={16}/>}
              </button>
            </div>
          </div>
        </div>

        <div className="chat-footer-hints">
          <span className="chat-hint-text">
            <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line · drag PDF to upload
          </span>
          <span className="chat-hint-disclaimer">Spectra AI can make mistakes. Verify important info.</span>
        </div>
      </div>
    </div>
  );
}
