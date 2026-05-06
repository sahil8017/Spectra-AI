import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 180000,
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('spectra_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper for handling Server-Sent Events (SSE) streaming responses
const handleStream = async (url, body, onChunk, onMetadata) => {
  const token = localStorage.getItem('spectra_token');
  const response = await fetch(`${API_URL}${url}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Network error');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop(); 

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6).trim();
        if (dataStr === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(dataStr);
          // Handle various data formats from backend
          if (parsed.text && onChunk) onChunk(parsed.text);
          if (parsed.status === 'processing' && onMetadata) onMetadata(parsed);
          if (parsed.conversation_id && onMetadata) onMetadata(parsed);
          if (parsed.error) throw new Error(parsed.error);
        } catch (e) {
          console.error('Stream error:', e);
        }
      }
    }
  }
};

export const chatApi = {
  getHistory: () => apiClient.get('/chat/history'),
  getMessages: (id) => apiClient.get(`/chat/history/${id}`),
  deleteConversation: (id) => apiClient.delete(`/chat/history/${id}`),
  sendMessageStream: (message, conversationId, history = [], onChunk, onMetadata) => {
    return handleStream('/chat', {
      message,
      conversation_id: conversationId,
      history,
    }, onChunk, onMetadata);
  },
  getUsage: () => apiClient.get('/chat/usage'),
};

export const documentApi = {
  uploadPdf: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/document/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getDocumentStatus: (docId) => apiClient.get(`/document/status/${docId}`),

  queryDocumentStream: (docId, query, topK = 5, history = [], onChunk, onMetadata) => {
    return handleStream('/document/query', {
      doc_id: docId,
      query,
      top_k: topK,
      history,
    }, onChunk, onMetadata);
  },
};

export const youtubeApi = {
  summarizeStream: (url, summaryLength = 'medium', onChunk, onMetadata) => {
    return handleStream('/youtube/summarize', {
      url,
      summary_length: summaryLength,
    }, onChunk, onMetadata);
  },
};

export const adminApi = {
  getAuditLogs: (params) => apiClient.get('/admin/audit-logs', { params }),
  getMetrics: () => apiClient.get('/admin/metrics'),
};

export const gdprApi = {
  deleteMyData: () => apiClient.post('/auth/gdpr-delete'),
  exportMyData: () => apiClient.get('/auth/gdpr-export'),
};

