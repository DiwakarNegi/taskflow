# TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, kanban boards, and real-time dashboard.

## 🚀 Live Demo

> Deploy URL goes here after Railway deployment

## ✨ Features

- **Authentication** — JWT-based signup/login with bcrypt password hashing
- **Projects** — Create & manage projects, track progress
- **Role-Based Access Control** — Admin / Member roles per project
  - Admins: full CRUD on tasks, manage members, edit/delete project
  - Members: create tasks, edit own or assigned tasks, update status
- **Task Management** — Create, assign, filter, and track tasks
  - Statuses: Todo / In Progress / Done
  - Priorities: Low / Medium / High
  - Due dates with overdue detection
- **Kanban Board** — Visual drag-style board view with columns per status
- **List View** — Sortable table view with filters
- **Dashboard** — Personal stats, assigned tasks, overdue alerts
- **Team Management** — Search users, add to projects, change roles, remove

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcryptjs |
| Frontend | React 18 + React Router v6 |
| Build | Vite |
| Deployment | Railway |

## 📂 Project Structure

```
taskflow/
├── server/
│   └── index.js          # All API routes + DB setup
├── client/
│   ├── src/
│   │   ├── pages/         # Dashboard, Projects, ProjectDetail, Login, Signup
│   │   ├── components/    # AppShell, TaskModal, MembersTab
│   │   ├── context/       # AuthContext
│   │   ├── api.js         # Fetch wrapper
│   │   └── index.css      # Full design system
│   └── vite.config.js
├── railway.json
├── nixpacks.toml
└── README.md
```

## 🔌 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Projects
| Method | Path | Auth | Role |
|--------|------|------|------|
| GET | `/api/projects` | ✓ | any member |
| POST | `/api/projects` | ✓ | creator = admin |
| GET | `/api/projects/:id` | ✓ | any member |
| PUT | `/api/projects/:id` | ✓ | admin |
| DELETE | `/api/projects/:id` | ✓ | admin |

### Members
| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | `/api/projects/:id/members` | ✓ | admin |
| PUT | `/api/projects/:id/members/:uid` | ✓ | admin |
| DELETE | `/api/projects/:id/members/:uid` | ✓ | admin |

### Tasks
| Method | Path | Auth | Role |
|--------|------|------|------|
| GET | `/api/projects/:id/tasks` | ✓ | any member |
| POST | `/api/projects/:id/tasks` | ✓ | any member |
| PUT | `/api/projects/:id/tasks/:tid` | ✓ | admin or creator/assignee |
| DELETE | `/api/projects/:id/tasks/:tid` | ✓ | admin or creator |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Stats + my tasks + overdue |

## 🏃 Running Locally

```bash
# Install all dependencies
npm run install:all

# Run dev (backend port 3001, frontend port 5173)
npm run dev

# Open http://localhost:5173
```

## 🚂 Deploy to Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Set environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your_very_long_random_secret_here
   PORT=3001
   ```
5. Railway auto-detects `nixpacks.toml` and builds/deploys

**Note:** SQLite DB persists in Railway's ephemeral filesystem. For production, add a PostgreSQL volume or use Railway's PostgreSQL plugin.

## 🔐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `JWT_SECRET` | (insecure default) | **Change in production!** |
| `NODE_ENV` | development | Set to `production` on Railway |
| `DB_PATH` | `./taskflow.db` | SQLite database path |

## 🎨 Design

- Dark theme with purple/green accent palette
- Syne (display) + DM Sans (body) typography
- Kanban board, list view, dashboard with stats
- Fully responsive
