import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut, Plus, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './UI';
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    apiFetch('/projects').then(d => setProjects(d.projects.slice(0, 8))).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">T</div>
        <span className="logo-text">TaskFlow</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FolderKanban size={16} /> All Projects
        </NavLink>

        {projects.length > 0 && (
          <>
            <div className="nav-section-title">Recent Projects</div>
            {projects.map(p => (
              <NavLink key={p.id} to={`/projects/${p.id}`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="project-dot" style={{ background: p.color }} />
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </>
        )}

        <div className="nav-section-title">Actions</div>
        <button className="nav-link" onClick={() => navigate('/projects?new=1')}>
          <Plus size={16} /> New Project
        </button>
      </nav>

      <div className="sidebar-user">
        <div className="user-card">
          <Avatar name={user?.name} color={user?.avatar_color} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="truncate font-medium" style={{ fontSize: 13 }}>{user?.name}</div>
            <div className="truncate text-muted text-sm">{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={handleLogout} data-tooltip="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
