const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

// Get tasks for a project
router.get('/project/:projectId', authenticate, requireProjectRole(['admin','member']), (req, res) => {
  const { status, priority, assignee_id } = req.query;
  let query = `
    SELECT t.*, 
      u.name as assignee_name, u.avatar_color as assignee_color,
      c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    JOIN users c ON c.id = t.creator_id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee_id) { query += ' AND t.assignee_id = ?'; params.push(assignee_id); }
  query += ' ORDER BY CASE t.priority WHEN "urgent" THEN 0 WHEN "high" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, t.due_date ASC NULLS LAST, t.created_at DESC';

  res.json({ tasks: db.prepare(query).all(...params) });
});

// Get dashboard stats
router.get('/dashboard', authenticate, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name, u.avatar_color as assignee_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.assignee_id = ? AND t.status != 'done'
    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    LIMIT 10
  `).all(userId, userId);

  const overdue = db.prepare(`
    SELECT COUNT(*) as count FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    WHERE t.assignee_id = ? AND t.due_date < ? AND t.status != 'done'
  `).get(userId, userId, today);

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) as review,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN t.due_date < ? AND t.status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    WHERE t.assignee_id = ?
  `).get(today, userId, userId);

  const recentActivity = db.prepare(`
    SELECT t.id, t.title, t.status, t.updated_at, p.name as project_name, p.color as project_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    ORDER BY t.updated_at DESC
    LIMIT 8
  `).all(userId);

  res.json({ myTasks, stats, overdue: overdue.count, recentActivity });
});

// Create task
router.post('/', authenticate, [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('project_id').isInt(),
  body('priority').optional().isIn(['low','medium','high','urgent']),
  body('status').optional().isIn(['todo','in_progress','review','done']),
  body('due_date').optional({ nullable: true }).isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, project_id, assignee_id, priority = 'medium', status = 'todo', due_date } = req.body;

  // Check membership
  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  // Validate assignee is member
  if (assignee_id) {
    const assigneeMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(project_id, assignee_id);
    if (!assigneeMember) return res.status(400).json({ error: 'Assignee is not a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, priority, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, project_id, assignee_id || null, req.user.id, priority, status, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id JOIN users c ON c.id = t.creator_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// Update task
router.put('/:taskId', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a project member' });

  const { title, description, status, priority, assignee_id, due_date } = req.body;

  const allowed = ['todo','in_progress','review','done'];
  const allowedP = ['low','medium','high','urgent'];
  if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (priority && !allowedP.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assignee_id = CASE WHEN ? = '__null__' THEN NULL WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      due_date = CASE WHEN ? = '__null__' THEN NULL WHEN ? IS NOT NULL THEN ? ELSE due_date END
    WHERE id = ?
  `).run(
    title || null,
    description !== undefined ? 1 : null, description,
    status || null, priority || null,
    assignee_id === null ? '__null__' : (assignee_id || null),
    assignee_id === null ? '__null__' : (assignee_id || null),
    assignee_id === null ? null : (assignee_id || null),
    due_date === null ? '__null__' : (due_date || null),
    due_date === null ? '__null__' : (due_date || null),
    due_date === null ? null : (due_date || null),
    req.params.taskId
  );

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id JOIN users c ON c.id = t.creator_id
    WHERE t.id = ?
  `).get(req.params.taskId);
  res.json({ task: updated });
});

// Delete task
router.delete('/:taskId', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a project member' });
  if (member.role !== 'admin' && task.creator_id !== req.user.id) return res.status(403).json({ error: 'Only admins or task creators can delete' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ success: true });
});

// Comments
router.get('/:taskId/comments', authenticate, (req, res) => {
  const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const member = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a project member' });
  const comments = db.prepare(`
    SELECT tc.*, u.name, u.avatar_color FROM task_comments tc JOIN users u ON u.id = tc.user_id
    WHERE tc.task_id = ? ORDER BY tc.created_at ASC
  `).all(req.params.taskId);
  res.json({ comments });
});

router.post('/:taskId/comments', authenticate, [
  body('content').trim().isLength({ min: 1, max: 1000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const member = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a project member' });
  const result = db.prepare('INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)').run(req.params.taskId, req.user.id, req.body.content);
  const comment = db.prepare('SELECT tc.*, u.name, u.avatar_color FROM task_comments tc JOIN users u ON u.id = tc.user_id WHERE tc.id = ?').get(result.lastInsertRowid);
  res.status(201).json({ comment });
});

module.exports = router;
