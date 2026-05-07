import { useState, useEffect } from 'react';
import { api } from '../api';

export default function TaskModal({ projectId, task, members, myRole, userId, onClose, onSaved, onDeleted }) {
  const isEdit = !!task;
  const canEdit = myRole === 'admin' || (task ? (task.creator_id === userId || task.assignee_id === userId) : true);

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const body = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null };
      if (isEdit) {
        await api.put(`/projects/${projectId}/tasks/${task.id}`, body);
        onSaved({ ...task, ...body });
      } else {
        const t = await api.post(`/projects/${projectId}/tasks`, body);
        onSaved(t);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const del = async () => {
    if (!confirm('Delete this task?')) return;
    setLoading(true);
    try {
      await api.delete(`/projects/${projectId}/tasks/${task.id}`);
      onDeleted(task.id);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Task' : 'New Task'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to be done?" required autoFocus disabled={!canEdit} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add details..." disabled={!canEdit} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control" value={form.priority} onChange={e => set('priority', e.target.value)} disabled={!canEdit}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-control" value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)} disabled={!canEdit}>
                <option value="">Unassigned</option>
                {members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-control" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} disabled={!canEdit} />
            </div>
          </div>
          {isEdit && task.creator_name && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: 12 }}>Created by {task.creator_name}</p>
          )}
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <div>
              {isEdit && (myRole === 'admin' || task.creator_id === userId) && (
                <button type="button" className="btn btn-danger btn-sm" onClick={del} disabled={loading}>Delete</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              {canEdit && <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}</button>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
