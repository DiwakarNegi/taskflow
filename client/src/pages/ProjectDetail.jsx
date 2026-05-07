import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';
import MembersTab from '../components/MembersTab';

function isOverdue(due) {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const COLUMNS = [
  { key: 'todo', label: 'To Do', dot: '#5a5a7a' },
  { key: 'in_progress', label: 'In Progress', dot: '#3b82f6' },
  { key: 'done', label: 'Done', dot: '#10d98a' },
];

function TaskCard({ task, onClick }) {
  return (
    <div className="task-card" onClick={() => onClick(task)}>
      <div className="task-title">{task.title}</div>
      {task.description && <div style={{ fontSize: '0.78rem', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
      <div className="task-meta">
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {task.assignee_name && (
          <span className="task-assignee">👤 {task.assignee_name}</span>
        )}
        {task.due_date && (
          <span className={`due${isOverdue(task.due_date) ? ' overdue' : ''}`}>
            {isOverdue(task.due_date) ? '⚠ ' : '📅 '}{formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task object
  const [filters, setFilters] = useState({ priority: '', assignee: '' });
  const [editProject, setEditProject] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editError, setEditError] = useState('');

  const fetchAll = async () => {
    try {
      const [p, t] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`)
      ]);
      setProject(p);
      setTasks(t);
    } catch { navigate('/projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  if (loading) return <div className="loading-page"><div className="spinner"/></div>;
  if (!project) return null;

  const myRole = project.my_role;

  let filtered = tasks;
  if (filters.priority) filtered = filtered.filter(t => t.priority === filters.priority);
  if (filters.assignee) filtered = filtered.filter(t => t.assignee_id === filters.assignee);

  const tasksByStatus = Object.fromEntries(COLUMNS.map(c => [c.key, filtered.filter(t => t.status === c.key)]));

  const pct = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;

  const onTaskSaved = (t) => {
    setTasks(prev => {
      const idx = prev.findIndex(x => x.id === t.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...prev[idx], ...t }; return n; }
      return [t, ...prev];
    });
    setTaskModal(null);
    // Refresh to get full data (assignee names etc)
    api.get(`/projects/${projectId}/tasks`).then(setTasks);
  };

  const onTaskDeleted = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setTaskModal(null);
  };

  const saveProject = async (e) => {
    e.preventDefault();
    setEditError('');
    try {
      await api.put(`/projects/${projectId}`, editForm);
      setProject(p => ({ ...p, ...editForm }));
      setEditProject(false);
    } catch (err) { setEditError(err.message); }
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${projectId}`);
    navigate('/projects');
  };

  return (
    <>
      <div className="page-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ padding: '4px 8px' }}>← Back</button>
          </div>
          <h2>{project.name}</h2>
          {project.description && <p>{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, align: 'flex-start', flexShrink: 0 }}>
          {myRole === 'admin' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditForm({ name: project.name, description: project.description || '' }); setEditProject(true); }}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={deleteProject}>Delete</button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setTaskModal('new')}>+ Add Task</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '10px 32px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{pct}% complete</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>·</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{tasks.length} tasks</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>·</span>
          <span className={`badge badge-${myRole}`}>{myRole}</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }}/></div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
            {['board', 'list', 'members'].map(t => (
              <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                {t === 'board' && '⊞ Board'}
                {t === 'list' && '≡ List'}
                {t === 'members' && `👥 Members (${project.members?.length})`}
              </button>
            ))}
          </div>
          {tab !== 'members' && (
            <div className="filter-bar">
              <select value={filters.priority} onChange={e => setFilters(f => ({...f, priority: e.target.value}))}>
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={filters.assignee} onChange={e => setFilters(f => ({...f, assignee: e.target.value}))}>
                <option value="">All Members</option>
                {project.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {(filters.priority || filters.assignee) && (
                <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ priority: '', assignee: '' })}>Clear</button>
              )}
            </div>
          )}
        </div>

        {tab === 'board' && (
          <div className="kanban">
            {COLUMNS.map(col => (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <div className="col-title">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot, display: 'inline-block' }}/>
                    {col.label}
                  </div>
                  <span className="col-count">{tasksByStatus[col.key]?.length}</span>
                </div>
                <div className="kanban-tasks">
                  {tasksByStatus[col.key]?.map(t => (
                    <TaskCard key={t.id} task={t} onClick={setTaskModal} />
                  ))}
                  {tasksByStatus[col.key]?.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '0.8rem', padding: '16px 0' }}>No tasks</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'list' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">◻</div>
                <h3>No tasks found</h3>
                <p>Add a task or adjust filters</p>
                <button className="btn btn-primary" onClick={() => setTaskModal('new')}>+ Add Task</button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Title', 'Status', 'Priority', 'Assignee', 'Due Date'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                        onClick={() => setTaskModal(t)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.88rem' }}>{t.title}</td>
                      <td style={{ padding: '12px 16px' }}><span className={`badge badge-${t.status}`}>{t.status.replace('_', ' ')}</span></td>
                      <td style={{ padding: '12px 16px' }}><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text2)' }}>{t.assignee_name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: isOverdue(t.due_date) ? 'var(--red)' : 'var(--text3)' }}>
                        {t.due_date ? `${isOverdue(t.due_date) ? '⚠ ' : ''}${formatDate(t.due_date)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'members' && (
          <MembersTab
            project={project}
            members={project.members || []}
            myRole={myRole}
            currentUserId={user.id}
            onRefresh={fetchAll}
          />
        )}
      </div>

      {taskModal && (
        <TaskModal
          projectId={projectId}
          task={taskModal === 'new' ? null : taskModal}
          members={project.members}
          myRole={myRole}
          userId={user.id}
          onClose={() => setTaskModal(null)}
          onSaved={onTaskSaved}
          onDeleted={onTaskDeleted}
        />
      )}

      {editProject && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditProject(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Project</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditProject(false)}>✕</button>
            </div>
            {editError && <div className="alert alert-error">{editError}</div>}
            <form onSubmit={saveProject}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-control" value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditProject(false)}>Cancel</button>
                <button className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
