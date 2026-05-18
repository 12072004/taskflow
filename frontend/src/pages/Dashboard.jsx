import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Loader, StatusBadge, PriorityBadge, DueDateLabel, Avatar } from '../components/UI';
import { AlertTriangle, Clock, CheckCircle2, ListTodo, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/tasks/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  const { myTasks = [], stats = {}, recentActivity = [] } = data || {};

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your tasks today.</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Assigned To Me', value: stats.total || 0, color: 'var(--accent)', icon: <ListTodo size={18} /> },
            { label: 'In Progress', value: stats.in_progress || 0, color: 'var(--inprog)', icon: <Clock size={18} /> },
            { label: 'Under Review', value: stats.review || 0, color: 'var(--review)', icon: <Clock size={18} /> },
            { label: 'Completed', value: stats.done || 0, color: 'var(--done)', icon: <CheckCircle2 size={18} /> },
            { label: 'Overdue', value: stats.overdue || 0, color: 'var(--danger)', icon: <AlertTriangle size={18} /> },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ '--accent-color': s.color }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ gap: 24 }}>
          {/* My Tasks */}
          <div>
            <div className="flex-between mb-16">
              <h2 className="section-title">My Open Tasks</h2>
            </div>
            {myTasks.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>No tasks assigned to you. You're all caught up!</p>
              </div>
            ) : (
              <div className="gap-8">
                {myTasks.map(t => (
                  <div key={t.id} className={`task-card priority-${t.priority}`}
                    onClick={() => navigate(`/projects/${t.project_id}`)}>
                    <div className="flex-between" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{t.project_name}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="task-title">{t.title}</div>
                    <div className="task-meta">
                      <StatusBadge status={t.status} />
                      {t.due_date && <DueDateLabel date={t.due_date} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="section-title mb-16">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)' }}>
                <p>No recent activity yet.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                {recentActivity.map((t, i) => (
                  <div key={t.id} onClick={() => navigate(`/projects/${t.project_id || 0}`)}
                    style={{ padding: '12px 16px', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div className="flex-between">
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="project-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: t.project_color, display: 'inline-block' }} />
                          <span className="text-sm text-muted">{t.project_name}</span>
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
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
