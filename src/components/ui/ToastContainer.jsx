import { useChat } from '../../context/ChatContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={16} color="#10b981" />,
  error:   <AlertCircle  size={16} color="#ef4444" />,
  warning: <AlertTriangle size={16} color="#f59e0b" />,
  info:    <Info          size={16} color="#06b6d4" />,
};

export default function ToastContainer() {
  const { toasts, removeToast } = useChat();

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-normal)',
          borderRadius: 'var(--radius-md)',
          padding: '11px 14px',
          fontSize: 14, fontWeight: 500,
          boxShadow: 'var(--shadow-md)',
          animation: 'slideInRight 0.3s var(--ease-normal) both',
          pointerEvents: 'all',
          maxWidth: 320,
        }}>
          {ICONS[t.type] || ICONS.info}
          <span style={{ flex: 1, color: 'var(--text-primary)' }}>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{ color: 'var(--text-muted)', width: 20, height: 20 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
