const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_dev_key_change_in_prod';

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireProjectRole = (roles) => (req, res, next) => {
  const projectId = req.params.projectId || req.body.project_id;
  const member = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);
  if (!member || !roles.includes(member.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  req.projectRole = member.role;
  next();
};

module.exports = { authenticate, requireProjectRole, JWT_SECRET };
