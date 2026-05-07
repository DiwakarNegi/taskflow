const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');


const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_2024_change_in_prod';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskflow.db');

// ── Database setup ──────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','member')),
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    assignee_id TEXT,
    creator_id TEXT NOT NULL,
    due_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );
`);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Project member + role check middleware
function projectAccess(requiredRole = null) {
  return (req, res, next) => {
    const projectId = req.params.projectId || req.body.project_id;
    const member = db.prepare(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(projectId, req.user.id);
    if (!member) return res.status(403).json({ error: 'Not a project member' });
    if (requiredRole === 'admin' && member.role !== 'admin')
      return res.status(403).json({ error: 'Admin access required' });
    req.memberRole = member.role;
    next();
  };
}

// ── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const hashed = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)').run(id, name, email, hashed);

  const token = jwt.sign({ id, name, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, name, email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ── User Routes ──────────────────────────────────────────────────────────────
app.get('/api/users/search', auth, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const users = db.prepare(
    "SELECT id, name, email FROM users WHERE (name LIKE ? OR email LIKE ?) AND id != ? LIMIT 10"
  ).all(`%${q}%`, `%${q}%`, req.user.id);
  res.json(users);
});

// ── Project Routes ───────────────────────────────────────────────────────────
app.get('/api/projects', auth, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, u.name as owner_name, pm.role as my_role,
           (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
           (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
           (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json(projects);
});

app.post('/api/projects', auth, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });

  const id = uuidv4();
  db.prepare('INSERT INTO projects (id, name, description, owner_id) VALUES (?, ?, ?, ?)').run(id, name, description || '', req.user.id);
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(id, req.user.id, 'admin');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

app.get('/api/projects/:projectId', auth, projectAccess(), (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, pm.role as my_role
    FROM projects p
    JOIN users u ON u.id = p.owner_id
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.id = ?
  `).get(req.user.id, req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.role DESC, u.name
  `).all(req.params.projectId);

  res.json({ ...project, members });
});

app.put('/api/projects/:projectId', auth, projectAccess('admin'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?').run(name, description || '', req.params.projectId);
  res.json({ success: true });
});

app.delete('/api/projects/:projectId', auth, projectAccess('admin'), (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ success: true });
});

// ── Member Routes ─────────────────────────────────────────────────────────────
app.post('/api/projects/:projectId/members', auth, projectAccess('admin'), (req, res) => {
  const { user_id, role = 'member' } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, user_id);
  if (existing) return res.status(409).json({ error: 'User already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.projectId, user_id, role);
  res.status(201).json({ success: true });
});

app.put('/api/projects/:projectId/members/:userId', auth, projectAccess('admin'), (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  // Can't demote the only admin
  if (role === 'member') {
    const adminCount = db.prepare("SELECT COUNT(*) as c FROM project_members WHERE project_id = ? AND role = 'admin'").get(req.params.projectId).c;
    const targetRole = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, req.params.userId)?.role;
    if (adminCount === 1 && targetRole === 'admin') return res.status(400).json({ error: 'Cannot demote the only admin' });
  }

  db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(role, req.params.projectId, req.params.userId);
  res.json({ success: true });
});

app.delete('/api/projects/:projectId/members/:userId', auth, projectAccess('admin'), (req, res) => {
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id === req.params.userId) return res.status(400).json({ error: 'Cannot remove project owner' });
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
  res.json({ success: true });
});

// ── Task Routes ───────────────────────────────────────────────────────────────
app.get('/api/projects/:projectId/tasks', auth, projectAccess(), (req, res) => {
  const { status, priority, assignee } = req.query;
  let query = `
    SELECT t.*, u.name as assignee_name, u.email as assignee_email,
           c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    JOIN users c ON c.id = t.creator_id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }
  query += ' ORDER BY t.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

app.post('/api/projects/:projectId/tasks', auth, projectAccess(), (req, res) => {
  const { title, description, status, priority, assignee_id, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  if (assignee_id) {
    const isMember = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, creator_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.projectId, title, description || '', status || 'todo', priority || 'medium', assignee_id || null, req.user.id, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id JOIN users c ON c.id = t.creator_id
    WHERE t.id = ?
  `).get(id);
  res.status(201).json(task);
});

app.put('/api/projects/:projectId/tasks/:taskId', auth, projectAccess(), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update tasks they created or are assigned to (admins can update any)
  if (req.memberRole === 'member' && task.creator_id !== req.user.id && task.assignee_id !== req.user.id)
    return res.status(403).json({ error: 'Not authorized to edit this task' });

  const { title, description, status, priority, assignee_id, due_date } = req.body;
  if (assignee_id) {
    const isMember = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, due_date = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title ?? task.title, description ?? task.description, status ?? task.status,
    priority ?? task.priority, assignee_id !== undefined ? assignee_id : task.assignee_id,
    due_date !== undefined ? due_date : task.due_date, req.params.taskId
  );
  res.json({ success: true });
});

app.delete('/api/projects/:projectId/tasks/:taskId', auth, projectAccess(), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.memberRole === 'member' && task.creator_id !== req.user.id)
    return res.status(403).json({ error: 'Only admins or task creators can delete tasks' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ success: true });
});

// ── Dashboard Route ───────────────────────────────────────────────────────────
app.get('/api/dashboard', auth, (req, res) => {
  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.assignee_id = ? AND t.status != 'done'
    ORDER BY t.due_date ASC, t.priority DESC
    LIMIT 20
  `).all(req.user.id, req.user.id);

  const overdue = db.prepare(`
    SELECT t.*, p.name as project_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    WHERE t.due_date < date('now') AND t.status != 'done' AND t.assignee_id = ?
    ORDER BY t.due_date ASC
  `).all(req.user.id, req.user.id);

  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as total_projects,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
      SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo_tasks
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN tasks t ON t.project_id = p.id
  `).get(req.user.id);

  res.json({ myTasks, overdue, stats });
});

// ── Serve React build in production ──────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

app.listen(PORT, () => console.log(`TaskFlow server running on port ${PORT}`));
