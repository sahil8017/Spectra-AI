import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatApi, documentApi, youtubeApi } from '../services/api';

const ChatContext = createContext();

export const AVAILABLE_MODELS = [
  { id: 'spectra-flash', name: 'Spectra Flash', description: 'Fastest responses for everyday tasks', badge: 'Fast', icon: '⚡' },
  { id: 'spectra-pro', name: 'Spectra Pro', description: 'Advanced reasoning & deep analysis', badge: 'Smart', icon: '🧠' },
  { id: 'spectra-rag', name: 'Spectra RAG', description: 'Document & PDF intelligence mode', badge: 'Docs', icon: '📄' },
];

const QUICK_SUGGESTIONS = [
  { id: '1', label: 'Write a professional email' },
  { id: '2', label: 'Explain quantum computing simply' },
  { id: '3', label: 'Plan a 3-day trip to Tokyo' },
  { id: '4', label: 'Fix a JavaScript bug' },
];

const PROMPT_TEMPLATES = [
  { id: 'email', icon: '📧', label: 'Email draft', template: 'Write a professional email to [recipient] about [topic]. Tone: [formal/casual]. Key points: ' },
  { id: 'blog', icon: '📝', label: 'Blog post', template: 'Write a blog post titled "[title]". Target audience: [audience]. Word count: ~[N] words. Outline: ' },
  { id: 'code', icon: '💻', label: 'Code task', template: 'Write a [language] function that [description]. Requirements:\n- \n- \nReturn: ' },
  { id: 'summary', icon: '📋', label: 'Summarize', template: 'Summarize the following text in [3 bullet points / 1 paragraph / key takeaways]:\n\n' },
  { id: 'resume', icon: '📄', label: 'Resume bullet', template: 'Rewrite this resume bullet point to be more impactful (use action verbs, quantify where possible):\n\n' },
  { id: 'compare', icon: '⚖️', label: 'Compare', template: 'Compare and contrast [A] vs [B]. Cover: pros/cons, use cases, key differences. Format as a table.' },
];

const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};

export const ChatProvider = ({ children }) => {
  /* ── Conversations ──────────────────────────────── */
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, _setCurrentConvId] = useState(null);

  /* ── UI ─────────────────────────────────────────── */
  const [theme, setThemeState] = useState(() => load('spectra_theme', 'dark'));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState(() => load('spectra_lang', 'en'));

  /* ── User profile ───────────────────────────────── */
  const [userProfile, setUserProfile] = useState(() => load('spectra_profile', {
    name: '', avatar: null, customInstructions: '', tone: 'default',
  }));

  /* ── AI preferences ─────────────────────────────── */
  const [selectedModel, setSelectedModel] = useState(() => load('spectra_model', AVAILABLE_MODELS[0].id));
  const [responseLength, setResponseLength] = useState(() => load('spectra_length', 'balanced'));
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const [currentDocId, setCurrentDocId] = useState(null);

  /* ── Memory settings ─────────────────────────────── */
  const [memoryEnabled, setMemoryEnabled] = useState(() => load('spectra_memory', true));
  const [memories, setMemories] = useState(() => load('spectra_memories', []));
  const [tempChatMode, setTempChatMode] = useState(false);

  /* ── Toasts ─────────────────────────────────────── */
  const [toasts, setToasts] = useState([]);

  /* ── Network status ─────────────────────────────── */
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  /* ── Abort controller ───────────────────────────── */
  const abortRef = useRef(null);

  /* ── Persist ────────────────────────────────────── */
  useEffect(() => { 
    document.documentElement.setAttribute('data-theme', theme); 
    localStorage.setItem('spectra_theme', JSON.stringify(theme)); 
  }, [theme]);

  useEffect(() => { localStorage.setItem('spectra_lang', JSON.stringify(language)); }, [language]);
  useEffect(() => { localStorage.setItem('spectra_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('spectra_model', JSON.stringify(selectedModel)); }, [selectedModel]);
  useEffect(() => { localStorage.setItem('spectra_length', JSON.stringify(responseLength)); }, [responseLength]);
  useEffect(() => { localStorage.setItem('spectra_memory', JSON.stringify(memoryEnabled)); }, [memoryEnabled]);
  useEffect(() => { localStorage.setItem('spectra_memories', JSON.stringify(memories)); }, [memories]);

  /* ── Network detection ──────────────────────────── */
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); addToast('Back online', 'success'); };
    const handleOffline = () => { setIsOnline(false); addToast('You are offline', 'error'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  /* ── Toast helpers ──────────────────────────────── */
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  /* ── Theme ──────────────────────────────────────── */
  const setTheme = (t) => setThemeState(t);
  const toggleTheme = () => setThemeState(p => p === 'dark' ? 'light' : 'dark');
  const toggleSidebar = () => setSidebarOpen(p => !p);

  /* ── Conversation CRUD ──────────────────────────── */
  const createConversation = useCallback((type = 'general') => {
    if (tempChatMode) { _setCurrentConvId('__temp__'); return '__temp__'; }
    const id = uuidv4();
    setConversations(prev => [{
      id, type,
      title: 'New conversation',
      messages: [],
      pinned: false,
      createdAt: new Date().toISOString(),
      model: selectedModel,
    }, ...prev]);
    _setCurrentConvId(id);
    setCurrentDocId(null);
    return id;
  }, [selectedModel, tempChatMode]);

  const createNewConversation = useCallback(() => createConversation('general'), [createConversation]);

  const setCurrentConversationId = useCallback((id) => {
    _setCurrentConvId(id);
    setCurrentDocId(null);
  }, []);

  const deleteConversation = useCallback((id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) _setCurrentConvId(null);
  }, [currentConversationId]);

  const clearAllConversations = useCallback(() => {
    setConversations([]); _setCurrentConvId(null);
    addToast('All conversations cleared', 'success');
  }, [addToast]);

  const renameConversation = useCallback((id, title) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  }, []);

  const pinConversation = useCallback((id) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  }, []);

  /* ── Messages ───────────────────────────────────── */
  const [tempMessages, setTempMessages] = useState([]);

  const addMessage = useCallback((conversationId, role, content, metadata = null) => {
    const msgId = uuidv4();
    const msg = { id: msgId, role, content, timestamp: new Date().toISOString(), metadata, liked: null };

    if (conversationId === '__temp__') {
      setTempMessages(prev => [...prev, msg]);
      return msgId;
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c;
      let title = c.title;
      if (c.messages.length === 0 && role === 'user') {
        title = content.replace(/\*\*/g, '').substring(0, 45) + (content.length > 45 ? '…' : '');
      }
      return { ...c, title, messages: [...c.messages, msg] };
    }));
    return msgId;
  }, []);

  const updateLastMessage = useCallback((conversationId, appendContent) => {
    if (conversationId === '__temp__') {
      setTempMessages(prev => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last.role !== 'assistant') return prev;
        return [...prev.slice(0, -1), { ...last, content: last.content + appendContent }];
      });
      return;
    }
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId || !c.messages.length) return c;
      const last = c.messages[c.messages.length - 1];
      if (last.role !== 'assistant') return c;
      return { ...c, messages: [...c.messages.slice(0, -1), { ...last, content: last.content + appendContent }] };
    }));
  }, []);

  const setLastMessageError = useCallback((conversationId, error) => {
    const setter = (msgs) => {
      if (!msgs.length) return msgs;
      const last = msgs[msgs.length - 1];
      if (last.role !== 'assistant') return msgs;
      return [...msgs.slice(0, -1), { ...last, error, content: last.content || '' }];
    };
    if (conversationId === '__temp__') { setTempMessages(setter); return; }
    setConversations(prev => prev.map(c => c.id !== conversationId ? c : { ...c, messages: setter(c.messages) }));
  }, []);

  const likeMessage = useCallback((conversationId, messageId, value) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c;
      return { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, liked: value } : m) };
    }));
  }, []);

  const editMessage = useCallback((conversationId, messageId, newContent) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c;
      const idx = c.messages.findIndex(m => m.id === messageId);
      if (idx === -1) return c;
      return { ...c, messages: c.messages.slice(0, idx + 1).map((m, i) => i === idx ? { ...m, content: newContent } : m) };
    }));
  }, []);

  const deleteMessage = useCallback((conversationId, messageId) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c;
      return { ...c, messages: c.messages.filter(m => m.id !== messageId) };
    }));
  }, []);



  /* ── Stop generation ────────────────────────────── */
  const stopGeneration = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setIsLoading(false); setStreamingId(null);
  }, []);

  /* ── Send message ───────────────────────────────── */
  const sendMessage = useCallback(async (text, convId) => {
    if (!isOnline) { addToast('You are offline. Check your connection.', 'error'); return; }

    let activeId = convId;
    if (!activeId || (activeId !== '__temp__' && !conversations.find(c => c.id === activeId))) {
      activeId = createConversation('general');
    }

    const msgs = activeId === '__temp__' ? tempMessages : (conversations.find(c => c.id === activeId)?.messages || []);
    const history = msgs.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }));

    addMessage(activeId, 'user', text);
    addMessage(activeId, 'assistant', '');
    setIsLoading(true); setStreamingId(activeId);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(text.trim());
      if (isYT) {
        await youtubeApi.summarizeStream(text.trim(), 'medium', c => updateLastMessage(activeId, c), () => { });
      } else if (currentDocId) {
        await documentApi.queryDocumentStream(currentDocId, text, 5, history, c => updateLastMessage(activeId, c), () => { });
      } else {
        await chatApi.sendMessageStream(text, activeId, history, c => updateLastMessage(activeId, c));
      }
    } catch (err) {
      if (err.name !== 'AbortError') setLastMessageError(activeId, err.message || 'An error occurred');
    } finally {
      setIsLoading(false); setStreamingId(null); abortRef.current = null;
    }
    return activeId;
  }, [isOnline, conversations, tempMessages, currentDocId, addMessage, updateLastMessage, setLastMessageError, createConversation, addToast]);

  /* ── Upload document ────────────────────────────── */
  const uploadDocument = useCallback(async (file, optionalMessage, convId) => {
    let activeId = convId;
    if (!activeId) activeId = createConversation('document');
    addMessage(activeId, 'user', `📄 Uploaded: **${file.name}**${optionalMessage ? `\n\n${optionalMessage}` : ''}`);
    setIsLoading(true);
    addToast(`Uploading ${file.name}…`, 'info', 60000);
    try {
      const res = await documentApi.uploadPdf(file);
      setCurrentDocId(res.doc_id);
      addToast(`${file.name} processed (${res.chunks_stored} sections)`, 'success');
      if (optionalMessage) {
        addMessage(activeId, 'assistant', '');
        await documentApi.queryDocumentStream(res.doc_id, optionalMessage, 5, [], c => updateLastMessage(activeId, c), () => { });
      } else {
        addMessage(activeId, 'assistant', `✅ **${file.name}** processed (${res.chunks_stored} sections).\n\nAsk me anything about this document!`);
      }
    } catch (err) {
      addMessage(activeId, 'assistant', `❌ Upload failed: ${err.response?.data?.detail || err.message}`);
      addToast('Upload failed', 'error');
    } finally { setIsLoading(false); }
    return activeId;
  }, [addMessage, updateLastMessage, createConversation, addToast]);

  /* ── Regenerate ─────────────────────────────────── */
  const regenerateResponse = useCallback(async () => {
    if (!currentConversationId || isLoading) return;
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv || conv.messages.length < 1) return;
    const lastUser = [...conv.messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setConversations(prev => prev.map(c => {
      if (c.id !== currentConversationId) return c;
      const last = c.messages[c.messages.length - 1];
      if (last?.role === 'assistant') return { ...c, messages: c.messages.slice(0, -1) };
      return c;
    }));
    await sendMessage(lastUser.content, currentConversationId);
  }, [currentConversationId, conversations, isLoading, sendMessage]);

  /* ── Memory ─────────────────────────────────────── */
  const addMemory = useCallback((text) => {
    const id = uuidv4();
    setMemories(prev => [...prev, { id, text, createdAt: new Date().toISOString() }]);
    addToast('Memory saved', 'success');
  }, [addToast]);
  const deleteMemory = useCallback((id) => setMemories(prev => prev.filter(m => m.id !== id)), []);

  /* ── Export ─────────────────────────────────────── */
  const exportConversation = useCallback((id) => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    const text = conv.messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${conv.title}.txt`;
    a.click();
    addToast('Conversation exported', 'success');
  }, [conversations, addToast]);

  /* ── Computed ───────────────────────────────────── */
  const currentConversation = currentConversationId === '__temp__'
    ? { id: '__temp__', title: 'Temporary Chat', messages: tempMessages, pinned: false, createdAt: new Date().toISOString() }
    : (conversations.find(c => c.id === currentConversationId) || null);

  return (
    <ChatContext.Provider value={{
      conversations, currentConversationId, currentConversation,
      setCurrentConversationId, createConversation, createNewConversation,
      deleteConversation, clearAllConversations, renameConversation, pinConversation,
      addMessage, updateLastMessage, likeMessage, editMessage, deleteMessage,
      sendMessage, uploadDocument, regenerateResponse, stopGeneration,
      isLoading, streamingId, currentDocId, setCurrentDocId,
      selectedModel, setSelectedModel, availableModels: AVAILABLE_MODELS,
      responseLength, setResponseLength,
      theme, setTheme, toggleTheme, sidebarOpen, setSidebarOpen, toggleSidebar,
      language, setLanguage,
      userProfile, setUserProfile,
      memoryEnabled, setMemoryEnabled, memories, addMemory, deleteMemory,
      tempChatMode, setTempChatMode,
      toasts, addToast, removeToast,
      isOnline,
      renameConversation,
      quickSuggestions: QUICK_SUGGESTIONS,
      promptTemplates: PROMPT_TEMPLATES,
      exportConversation,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be inside ChatProvider');
  return ctx;
};
