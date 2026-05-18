import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Loader, Modal, toast, Avatar, StatusBadge, PriorityBadge,
  DueDateLabel, EmptyState, ProgressBar, Badge
} from '../components/UI';
import TaskModal from '../components/TaskModal';
import { Plus, Settings, UserPlus, Trash2, ArrowLeft, LayoutGrid, List } from 'lucide-react';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: 'var(--todo)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--inprog)' },
  { key: 'review', label: 'Review', color: 'var(--review)' },
  { key: 'done', label: 'Done', color: 'var(--done)' },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '', status: 'todo' });
  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        apiFetch(`/projects/${projectId}`),
        apiFetch(`/tasks/project/${projectId}`)
      ]);
      setProject(projRes.project);
      setMembers(projRes.members);
      setTasks(taskRes.tasks);
    } catch { navigate('/projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const myRole = project?.my_role;
  const isAdmin = myRole === 'admin';

  const addTask = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...taskForm, project_id: parseInt(projectId), assignee_id: taskForm.assignee_id || null, due_date: taskForm.due_date || null };
      const { task } = await apiFetch('/tasks', { method: 'POST', body });
      setTasks(t => [task, ...t]);
      setShowAddTask(false);
      setTaskForm({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '', status: 'todo' });
      toast.success('Task created!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const addMember = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/projects/${projectId}/members`, { method: 'POST', body: memberForm });
      const { members: m } = (await apiFetch(`/projects/${projectId}`)).members ? { members: (await apiFetch(`/projects/${projectId}`)).members } : { members };
      load();
      setMemberForm({ email: '', role: 'member' });
      toast.success('Member added!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await apiFetch(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
      setMembers(m => m.filter(x => x.id !== userId));
      toast.success('Member removed');
    } catch (err) { toast.error(err.message); }
  };

  const updateRole = async (userId, role) => {
    try {
      await apiFetch(`/projects/${projectId}/members/${userId}`, { method: 'PUT', body: { role } });
      setMembers(m => m.map(x => x.id === userId ? { ...x, role } : x));
      toast.success('Role updated');
    } catch (err) { toast.error(err.message); }
  };

  const deleteProject = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
      navigate('/projects');
      toast.success('Project deleted');
    } catch (err) { toast.error(err.message); }
  };

  const filteredTasks = tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Loader />;
  if (!project) return null;

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => navigate('/projects')}>
            <ArrowLeft size={14} /> Projects
          </button>
          <div className="flex-row" style={{ gap: 12, marginBottom: 2 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: project.color, display: 'inline-block', flexShrink: 0 }} />
            <h1 className="page-title">{project.name}</h1>
            <span className={`badge badge-${myRole}`}>{myRole}</span>
          </div>
          {project.description && <p className="page-subtitle">{project.description}</p>}
          <div style={{ marginTop: 12, maxWidth: 400 }}>
            <div className="flex-between" style={{ marginBottom: 4 }}>
              <span className="text-sm text-muted">{doneCount}/{tasks.length} tasks done</span>
              <span className="text-sm" style={{ color: 'var(--done)', fontWeight: 600 }}>{pct}%</span>
            </div>
            <ProgressBar value={pct} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowMembers(true)}>
            <div style={{ display: 'flex', marginRight: 6 }}>
              {members.slice(0, 3).map(m => (
                <Avatar key={m.id} name={m.name} color={m.avatar_color} size="sm" style={{ marginLeft: -6, border: '2px solid var(--bg2)' }} />
              ))}
            </div>
            {members.length} members
          </button>
          {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)}><Settings size={14} /></button>}
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}><Plus size={14} /> Add Task</button>
        </div>
      </div>

      <div className="page-body">
        {/* Filter bar */}
        <div className="filter-bar">
          <div style={{ display: 'flex', background: 'var(--bg3)', padding: 4, borderRadius: 'var(--radius-sm)', gap: 4 }}>
            <button className={`tab ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>
              <LayoutGrid size={13} style={{ marginRight: 4 }} />Board
            </button>
            <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              <List size={13} style={{ marginRight: 4 }} />List
            </button>
          </div>
          <input className="form-input" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 220 }} />
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
          <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Kanban */}
        {view === 'kanban' && (
          <div className="kanban">
            {STATUS_COLS.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.key);
              return (
                <div key={col.key} className="kanban-col">
                  <div className="kanban-header">
                    <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                    <span className="kanban-count">{colTasks.length}</span>
                  </div>
                  <div className="kanban-tasks">
                    {colTasks.map(t => (
                      <TaskCard key={t.id} task={t} onClick={() => setSelectedTask(t)} />
                    ))}
                    {colTasks.length === 0 && <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px 0' }}>No tasks</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List */}
        {view === 'list' && (
          filteredTasks.length === 0 ? (
            <EmptyState icon="📋" title="No tasks yet" subtitle="Add your first task to get started."
              action={<button className="btn btn-primary" onClick={() => setShowAddTask(true)}><Plus size={14} /> Add Task</button>} />
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Assignee</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(t => (
                      <tr key={t.id} onClick={() => setSelectedTask(t)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{t.title}</div>
                          {t.description && <div className="text-muted text-sm" style={{ marginTop: 2 }}>{t.description.slice(0, 60)}{t.description.length > 60 ? '…' : ''}</div>}
                        </td>
                        <td><StatusBadge status={t.status} /></td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td>
                          {t.assignee_id ? (
                            <div className="flex-row">
                              <Avatar name={t.assignee_name} color={t.assignee_color} size="sm" />
                              <span className="text-sm">{t.assignee_name}</span>
                            </div>
                          ) : <span className="text-muted text-sm">Unassigned</span>}
                        </td>
                        <td>{t.due_date ? <DueDateLabel date={t.due_date} /> : <span className="text-muted text-sm">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          members={members}
          projectRole={myRole}
          onClose={() => setSelectedTask(null)}
          onUpdate={updated => setTasks(ts => ts.map(t => t.id === updated.id ? updated : t))}
          onDelete={id => setTasks(ts => ts.filter(t => t.id !== id))}
        />
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <Modal title="New Task" onClose={() => setShowAddTask(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setShowAddTask(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addTask} disabled={saving || !taskForm.title.trim()}>
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </>}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="What needs to be done?" value={taskForm.title}
              onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="Add details…" value={taskForm.description}
              onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-select" value={taskForm.assignee_id} onChange={e => setTaskForm(f => ({ ...f, assignee_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={taskForm.due_date}
                onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Members Modal */}
      {showMembers && (
        <Modal title="Team Members" onClose={() => setShowMembers(false)}>
          {isAdmin && (
            <form onSubmit={addMember} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <input className="form-input" placeholder="Email address" type="email" value={memberForm.email}
                onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
              <select className="form-select" value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))} style={{ width: 110 }}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !memberForm.email}>
                <UserPlus size={14} /> Invite
              </button>
            </form>
          )}
          <div className="gap-8">
            {members.map(m => (
              <div key={m.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex-row">
                  <Avatar name={m.name} color={m.avatar_color} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name} {m.id === user.id && <span className="text-muted">(you)</span>}</div>
                    <div className="text-muted text-sm">{m.email}</div>
                  </div>
                </div>
                <div className="flex-row">
                  {isAdmin && m.id !== user.id ? (
                    <>
                      <select className="form-select" style={{ width: 100, fontSize: 11, padding: '4px 8px' }}
                        value={m.role} onChange={e => updateRole(m.id, e.target.value)}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeMember(m.id)}><Trash2 size={13} /></button>
                    </>
                  ) : (
                    <span className={`badge badge-${m.role}`}>{m.role}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Settings Modal */}
      {showSettings && isAdmin && (
        <Modal title="Project Settings" onClose={() => setShowSettings(false)}>
          <div style={{ marginBottom: 24 }}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input className="form-input" defaultValue={project.name} id="set-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" defaultValue={project.description || ''} id="set-desc" />
            </div>
            <button className="btn btn-primary btn-sm" onClick={async () => {
              try {
                const { project: up } = await apiFetch(`/projects/${projectId}`, { method: 'PUT', body: {
                  name: document.getElementById('set-name').value,
                  description: document.getElementById('set-desc').value
                }});
                setProject(p => ({ ...p, ...up }));
                toast.success('Project updated');
                setShowSettings(false);
              } catch (err) { toast.error(err.message); }
            }}>Save Changes</button>
          </div>
          <div className="divider" />
          <div>
            <div className="section-title" style={{ color: 'var(--danger)', marginBottom: 8, fontSize: 14 }}>Danger Zone</div>
            <button className="btn btn-danger" onClick={deleteProject}><Trash2 size={14} /> Delete Project</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function TaskCard({ task, onClick }) {
  return (
    <div className={`task-card priority-${task.priority}`} onClick={onClick}>
      <div className="task-title">{task.title}</div>
      <div className="task-meta">
        <PriorityBadge priority={task.priority} />
        {task.due_date && <DueDateLabel date={task.due_date} />}
      </div>
      {task.assignee_id && (
        <div className="flex-row" style={{ marginTop: 8 }}>
          <Avatar name={task.assignee_name} color={task.assignee_color} size="sm" />
          <span className="text-muted text-sm">{task.assignee_name}</span>
        </div>
      )}
    </div>
  );
}
