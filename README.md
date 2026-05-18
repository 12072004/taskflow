# TaskFlow — Team Task Manager

A full-stack task management web app with role-based access control, Kanban boards, and team collaboration features.

## 🚀 Live Demo

> Deploy to Railway and replace this with your live URL.

## ✨ Features

- **Authentication** — JWT-based signup/login, persistent sessions
- **Projects** — Create/edit/delete projects with color coding
- **Team Management** — Invite members by email, assign roles (Admin/Member)
- **Role-Based Access Control**
  - **Admin**: Full project control — manage members, delete tasks, edit settings
  - **Member**: Create and manage own tasks, comment on all tasks
- **Task Management**
  - Create tasks with title, description, priority, assignee, due date
  - Four statuses: To Do → In Progress → Review → Done
  - Four priorities: Low, Medium, High, Urgent
  - Inline status/priority/assignee editing
  - Comments on tasks
- **Kanban Board** — Drag tasks visually by status column
- **List View** — Tabular view with sortable columns
- **Dashboard**
  - Personal stats (assigned, in-progress, overdue)
  - My open tasks with due date warnings
  - Recent activity feed
- **Overdue Tracking** — Tasks past due date highlighted in red

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + React Router v6 |
| Styling | Custom CSS (no framework) |
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Build | Vite |
| Deployment | Railway |

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── db/database.js        # SQLite schema & connection
│   ├── middleware/auth.js    # JWT auth + role middleware
│   ├── routes/
│   │   ├── auth.js           # POST /signup, /login, GET /me
│   │   ├── projects.js       # CRUD + member management
│   │   └── tasks.js          # CRUD + comments + dashboard
│   └── server.js             # Express app entry point
├── frontend/
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── context/          # Auth context
│       ├── pages/            # Dashboard, Projects, ProjectDetail
│       └── utils/api.js      # Fetch wrapper with JWT
├── railway.toml              # Railway deployment config
└── package.json              # Root scripts
```

## 🔌 REST API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Get current user |

### Projects
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/projects` | Member | List user's projects |
| POST | `/api/projects` | Any | Create project |
| GET | `/api/projects/:id` | Member | Project + members |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin/Owner | Delete project |
| POST | `/api/projects/:id/members` | Admin | Invite member |
| PUT | `/api/projects/:id/members/:uid` | Admin | Change role |
| DELETE | `/api/projects/:id/members/:uid` | Admin | Remove member |

### Tasks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tasks/dashboard` | Yes | Personal stats |
| GET | `/api/tasks/project/:id` | Member | Project tasks |
| POST | `/api/tasks` | Member | Create task |
| PUT | `/api/tasks/:id` | Member | Update task |
| DELETE | `/api/tasks/:id` | Admin/Creator | Delete task |
| GET | `/api/tasks/:id/comments` | Member | Get comments |
| POST | `/api/tasks/:id/comments` | Member | Add comment |

## 🚢 Deployment on Railway

### Step-by-step

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
   git push -u origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
   - Select your `taskflow` repository
   - Railway auto-detects `railway.toml` configuration

3. **Set Environment Variables** in Railway dashboard:
   ```
   NODE_ENV=production
   JWT_SECRET=your_super_secret_key_min_32_chars
   DB_PATH=/data/taskflow.db
   PORT=3000
   ```

4. **Add Persistent Volume** (optional but recommended):
   - In Railway: Add Volume → Mount path `/data`
   - This keeps your SQLite database across deploys

5. **Get your URL** from Railway dashboard → Share it!

### Local Development

```bash
# Install all dependencies
npm run install:all

# Terminal 1: Start backend
npm run dev:backend     # runs on :3001

# Terminal 2: Start frontend
npm run dev:frontend    # runs on :5173 (proxies /api to :3001)
```

### Environment Variables

Create `backend/.env` for local dev:
```env
JWT_SECRET=dev_secret_key_change_in_production
PORT=3001
```

## 🔐 Security Features

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days
- All API routes validate membership before access
- Role checks on every destructive operation
- Input validation on all endpoints via express-validator
- SQL injection prevented via parameterized queries (better-sqlite3)

## 📊 Database Schema

```sql
users          (id, name, email, password, avatar_color)
projects       (id, name, description, color, owner_id)
project_members(id, project_id, user_id, role)
tasks          (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date)
task_comments  (id, task_id, user_id, content)
```

---

Built for the Full-Stack Team Task Manager assignment.
