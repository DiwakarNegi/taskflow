import { useState, useRef, useEffect } from 'react';
import { api } from '../api';

export default function MembersTab({ project, members, myRole, currentUserId, onRefresh }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults(await api.get(`/users/search?q=${encodeURIComponent(search)}`)); }
      catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const addMember = async (user) => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post(`/projects/${project.id}/members`, { user_id: user.id, role: 'member' });
      setSuccess(`${user.name} added as member`);
      setSearch(''); setResults([]);
      onRefresh();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const updateRole = async (userId, role) => {
    setError('');
    try {
      await api.put(`/projects/${project.id}/members/${userId}`, { role });
      onRefresh();
    } catch (err) { setError(err.message); }
  };

  const removeMember = async (userId, name) => {
    if (!confirm(`Remove ${name} from project?`)) return;
    setError('');
    try {
      await api.delete(`/projects/${project.id}/members/${userId}`);
      onRefresh();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {myRole === 'admin' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Add Member</h4>
          <div style={{ position: 'relative' }} ref={searchRef}>
            <input
              className="form-control"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {results.length > 0 && (
              <div className="search-results">
                {results.map(u => (
                  <div key={u.id} className="search-result-item" onClick={() => addMember(u)}>
                    <div className="name">{u.name}</div>
                    <div className="email">{u.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h4 style={{ marginBottom: 16, fontSize: '0.9rem' }}>Team Members ({members.length})</h4>
        <table className="members-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              {myRole === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{m.name} {m.id === currentUserId && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(you)</span>}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{m.email}</div>
                </td>
                <td><span className={`badge badge-${m.role}`}>{m.role}</span></td>
                {myRole === 'admin' && (
                  <td>
                    {m.id !== currentUserId && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          style={{ padding: '4px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.78rem', cursor: 'pointer' }}
                          value={m.role}
                          onChange={e => updateRole(m.id, e.target.value)}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id, m.name)}>Remove</button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
