import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { Modal, ProgressBar, EmptyState, toast, Loader } from '../components/UI';
import { Plus, FolderKanban } from 'lucide-react';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316'];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(searchParams.get('new') === '1');
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch('/projects').then(d => setProjects(d.projects)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (searchParams.get('new') === '1') setShowNew(true); }, [searchParams]);

  const create = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const { project } = await apiFetch('/projects', { method: 'POST', body: form });
      setProjects(p => [project, ...p]);
      setShowNew(false);
      setForm({ name: '', description: '', color: COLORS[0] });
      setSearchParams({});
      toast.success('Project created!');
      navigate(`/projects/${project.id}`);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="page-body">
        {loading ? <Loader /> : projects.length === 0 ? (
          <EmptyState icon="📁" title="No projects yet" subtitle="Create your first project and invite your team."
            action={<button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> Create Project</button>} />
        ) : (
          <div className="projects-grid">
            {projects.map(p => {
              const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
              return (
                <div key={p.id} className="project-card" style={{ '--project-color': p.color }}
                  onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="flex-between" style={{ marginBottom: 12 }}>
                    <span className="badge badge-member" style={{ textTransform: 'none', fontSize: 12 }}>{p.my_role}</span>
                    <span className="text-sm text-muted">{p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
                  {p.description && <p className="text-muted text-sm" style={{ marginBottom: 12, lineHeight: 1.5 }}>{p.description}</p>}
                  <div className="flex-between" style={{ marginTop: 'auto' }}>
                    <span className="text-sm text-muted">{p.task_count} tasks</span>
                    <span className="text-sm" style={{ color: 'var(--done)', fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && (
        <Modal title="New Project" onClose={() => { setShowNew(false); setSearchParams({}); }}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={create} disabled={saving || !form.name.trim()}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </>}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="What is this project about?" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                  outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2, transition: 'outline 0.15s'
                }} onClick={() => setForm(f => ({ ...f, color: c }))} />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
