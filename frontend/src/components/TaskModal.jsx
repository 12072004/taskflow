import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { Modal, StatusBadge, PriorityBadge, Avatar, DueDateLabel, toast } from './UI';
import { Send, Trash2, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TaskModal({ task: initialTask, members, projectRole, onClose, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);

  const canEdit = projectRole === 'admin' || task.creator_id === user.id;

  useEffect(() => {
    apiFetch(`/tasks/${task.id}/comments`).then(d => setComments(d.comments)).catch(() => {});
  }, [task.id]);

  const updateField = async (field, value) => {
    try {
      const { task: updated } = await apiFetch(`/tasks/${task.id}`, { method: 'PUT', body: { [field]: value } });
      setTask(updated);
      onUpdate(updated);
    } catch (err) { toast.error(err.message); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { task: updated } = await apiFetch(`/tasks/${task.id}`, { method: 'PUT', body: editForm });
      setTask(updated);
      onUpdate(updated);
      setEditing(false);
      toast.success('Task updated');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const deleteTask = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await apiFetch(`/tasks/${task.id}`, { method: 'DELETE' });
      onDelete(task.id);
      onClose();
      toast.success('Task deleted');
    } catch (err) { toast.error(err.message); }
  };

  const addComment = async e => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentSaving(true);
    try {
      const { comment } = await apiFetch(`/tasks/${task.id}/comments`, { method: 'POST', body: { content: newComment } });
      setComments(c => [...c, comment]);
      setNewComment('');
    } catch (err) { toast.error(err.message); }
    finally { setCommentSaving(false); }
  };

  return (
    <Modal title="" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Title */}
        {editing ? (
          <input className="form-input" value={editForm.title ?? task.title}
            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
            style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }} />
        ) : (
          <div className="flex-between">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, lineHeight: 1.3, flex: 1 }}>{task.title}</h2>
            <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
              {canEdit && !editing && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(true); setEditForm({ title: task.title, description: task.description }); }}>
                  <Edit2 size={14} />
                </button>
              )}
              {(canEdit || projectRole === 'admin') && (
                <button className="btn btn-danger btn-icon btn-sm" onClick={deleteTask}><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        )}

        {/* Status & Priority Row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto', fontSize: 12 }} value={task.status}
            onChange={e => updateField('status', e.target.value)}>
            {['todo','in_progress','review','done'].map(s => <option key={s} value={s}>{s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto', fontSize: 12 }} value={task.priority}
            onChange={e => updateField('priority', e.target.value)}>
            {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>

        {/* Description */}
        {editing ? (
          <textarea className="form-input" value={editForm.description ?? task.description ?? ''}
            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Add description…" rows={3} />
        ) : task.description ? (
          <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.6 }}>{task.description}</p>
        ) : null}

        {editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>
              <Check size={14} /> Save
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              <X size={14} /> Cancel
            </button>
          </div>
        )}

        <div className="divider" />

        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Assignee</div>
            <select className="form-select" style={{ fontSize: 12 }}
              value={task.assignee_id || ''}
              onChange={e => updateField('assignee_id', e.target.value || null)}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Due Date</div>
            <input type="date" className="form-input" style={{ fontSize: 12 }}
              value={task.due_date || ''}
              onChange={e => updateField('due_date', e.target.value || null)} />
          </div>
        </div>

        <div className="divider" />

        {/* Comments */}
        <div>
          <div className="form-label" style={{ marginBottom: 10 }}>Comments ({comments.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <Avatar name={c.name} color={c.avatar_color} size="sm" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</span>
                    <span className="text-muted text-sm">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{c.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-muted text-sm">No comments yet.</p>}
          </div>
          <form onSubmit={addComment} style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder="Add a comment…" value={newComment}
              onChange={e => setNewComment(e.target.value)} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={commentSaving || !newComment.trim()}>
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
