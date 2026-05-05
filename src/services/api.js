import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 180000, // 180s for long LLM responses (YouTube summary)
});

// Helper for handling Server-Sent Events (SSE) streaming responses
const handleStream = async (url, body, onChunk, onMetadata) => {
  const response = await fetch(`${API_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    buffer = lines.pop(); // Keep the last incomplete chunk in the buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6).trim();
        if (dataStr === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'metadata' && onMetadata) {
            onMetadata(parsed);
          } else if (parsed.type === 'chunk' && onChunk) {
            onChunk(parsed.text);
          } else if (parsed.text && onChunk) {
            onChunk(parsed.text); // chat endpoint format
          }
        } catch (e) {
          console.error('Error parsing stream data:', dataStr, e);
        }
      }
    }
  }
};

export const chatApi = {
  sendMessageStream: async (message, conversationId, history = [], onChunk) => {
    await handleStream('/chat', {
      message,
      conversation_id: conversationId,
      history,
    }, onChunk);
  },
};

export const documentApi = {
  uploadPdf: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/document/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min for large PDFs
    });
    return response.data;
  },

  queryDocumentStream: async (docId, query, topK = 5, history = [], onChunk, onMetadata) => {
    await handleStream('/document/query', {
      doc_id: docId,
      query,
      top_k: topK,
      history,
    }, onChunk, onMetadata);
  },
};

export const youtubeApi = {
  summarizeStream: async (url, summaryLength = 'medium', onChunk, onMetadata) => {
    await handleStream('/youtube/summarize', {
      url,
      summary_length: summaryLength,
    }, onChunk, onMetadata);
  },
};
