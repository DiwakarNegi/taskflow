import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function isOverdue(due) {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"/></div>;

  const { stats, myTasks, overdue } = data;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back, {user?.name?.split(' ')[0]} 👋</p>
        </div>
      </div>
      <div className="page-body">
        <div className="stat-grid">
          <div className="stat-card purple">
            <div className="stat-icon">◈</div>
            <div className="stat-value">{stats?.total_projects ?? 0}</div>
            <div className="stat-label">Projects</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon">◻</div>
            <div className="stat-value">{stats?.todo_tasks ?? 0}</div>
            <div className="stat-label">To Do</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon">⟳</div>
            <div className="stat-value">{stats?.in_progress_tasks ?? 0}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">✓</div>
            <div className="stat-value">{stats?.done_tasks ?? 0}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">⚠</div>
            <div className="stat-value">{overdue?.length ?? 0}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem' }}>My Tasks</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{myTasks?.length} pending</span>
            </div>
            {myTasks?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: '0.88rem' }}>
                🎉 All caught up!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myTasks?.slice(0, 8).map(t => (
                  <div key={t.id} className="task-card" onClick={() => navigate(`/projects/${t.project_id}`)}>
                    <div className="task-title">{t.title}</div>
                    <div className="task-meta">
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      <span className={`badge badge-${t.status}`}>{t.status.replace('_', ' ')}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{t.project_name}</span>
                      {t.due_date && <span className={`due${isOverdue(t.due_date) ? ' overdue' : ''}`}>{isOverdue(t.due_date) ? '⚠ ' : '📅 '}{formatDate(t.due_date)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--red)' }}>⚠ Overdue Tasks</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{overdue?.length} tasks</span>
            </div>
            {overdue?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: '0.88rem' }}>
                ✓ No overdue tasks
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overdue?.map(t => (
                  <div key={t.id} className="task-card" style={{ borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => navigate(`/projects/${t.project_id}`)}>
                    <div className="task-title">{t.title}</div>
                    <div className="task-meta">
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{t.project_name}</span>
                      <span className="due overdue">⚠ Due {formatDate(t.due_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
