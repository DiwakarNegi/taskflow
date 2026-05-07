import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const p = await api.post('/projects', form);
      onCreated(p);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>New Project</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-control" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Website Redesign" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="What is this project about?" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/projects').then(setProjects).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"/></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Projects</h2>
          <p>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
      </div>
      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">◈</div>
            <h3>No projects yet</h3>
            <p>Create your first project to get started</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Project</button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map(p => {
              const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
              return (
                <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h3>{p.name}</h3>
                    <span className={`badge badge-${p.my_role}`}>{p.my_role}</span>
                  </div>
                  <p>{p.description || 'No description'}</p>
                  <div className="meta">
                    <span>👥 {p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
                    <span>◻ {p.task_count} task{p.task_count !== 1 ? 's' : ''}</span>
                    <span>✓ {p.done_count} done</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 4 }}>{pct}% complete</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={p => { setProjects(prev => [p, ...prev]); setShowCreate(false); navigate(`/projects/${p.id}`); }} />}
    </>
  );
}
