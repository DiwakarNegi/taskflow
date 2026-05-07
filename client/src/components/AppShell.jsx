import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function initials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>TaskFlow</h1>
          <p>Team Task Manager</p>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section">Navigation</div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="icon">⊞</span> Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="icon">◈</span> Projects
          </NavLink>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{initials(user?.name)}</div>
          <div className="user-info">
            <div className="name">{user?.name}</div>
            <div className="email">{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" title="Logout" onClick={() => { logout(); navigate('/login'); }} style={{ marginLeft: 'auto', flexShrink: 0 }}>⏻</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
