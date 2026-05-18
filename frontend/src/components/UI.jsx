import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Avatar({ name = '?', color = '#6366f1', size = 'md', className = '' }) {
  const sz = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`avatar ${sz} ${className}`} style={{ background: color }}>
      {initials}
    </div>
  );
}

export function Badge({ type, children }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const labels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
  return <Badge type={status}>{labels[status] || status}</Badge>;
}

export function PriorityBadge({ priority }) {
  const labels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
  return <Badge type={priority}>{labels[priority] || priority}</Badge>;
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Loader() {
  return <div className="loader-wrap"><div className="loader" /></div>;
}

let _addToast;
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  _addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? <CheckCircle2 size={16} color="var(--success)" /> : <AlertCircle size={16} color="var(--danger)" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
export const toast = { success: msg => _addToast?.(msg, 'success'), error: msg => _addToast?.(msg, 'error') };

export function DueDateLabel({ date }) {
  if (!date) return null;
  const d = new Date(date + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((d - now) / 86400000);
  const cls = diff < 0 ? 'due-overdue' : diff <= 2 ? 'due-soon' : 'due-ok';
  const label = diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  return <span className={`text-sm ${cls}`}>{label}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <p style={{ fontSize: 13, marginBottom: action ? 20 : 0 }}>{subtitle}</p>
      {action}
    </div>
  );
}
