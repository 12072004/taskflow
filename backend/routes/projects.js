const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

// Get all projects for user
router.get('/', authenticate, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
      pm.role as my_role
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json({ projects });
});

// Create project
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, color = '#6366f1' } = req.body;
  const result = db.prepare(
    'INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)'
  ).run(name, description || null, color, req.user.id);

  // Auto-add creator as admin
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project: { ...project, my_role: 'admin', member_count: 1, task_count: 0, done_count: 0 } });
});

// Get single project
router.get('/:projectId', authenticate, requireProjectRole(['admin','member']), (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, pm.role as my_role,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    WHERE p.id = ?
  `).get(req.user.id, req.params.projectId);

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.role DESC, u.name ASC
  `).all(req.params.projectId);

  res.json({ project, members });
});

// Update project (admin only)
router.put('/:projectId', authenticate, requireProjectRole(['admin']), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
], (req, res) => {
  const { name, description, color } = req.body;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  db.prepare('UPDATE projects SET name=?, description=?, color=? WHERE id=?').run(
    name || project.name,
    description !== undefined ? description : project.description,
    color || project.color,
    req.params.projectId
  );
  res.json({ project: db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId) });
});

// Delete project (admin only)
router.delete('/:projectId', authenticate, requireProjectRole(['admin']), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete project' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ success: true });
});

// Add member (admin only)
router.post('/:projectId/members', authenticate, requireProjectRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin','member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, role } = req.body;
  const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });

  const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.projectId, user.id, role);
  res.status(201).json({ member: { ...user, role } });
});

// Update member role (admin only)
router.put('/:projectId/members/:userId', authenticate, requireProjectRole(['admin']), [
  body('role').isIn(['admin','member']),
], (req, res) => {
  db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(
    req.body.role, req.params.projectId, req.params.userId
  );
  res.json({ success: true });
});

// Remove member (admin only)
router.delete('/:projectId/members/:userId', authenticate, requireProjectRole(['admin']), (req, res) => {
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
  if (parseInt(req.params.userId) === project.owner_id) return res.status(400).json({ error: "Cannot remove project owner" });
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
  res.json({ success: true });
});

module.exports = router;
