const jwt = require('jsonwebtoken');
const { User } = require('./models');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET is not set. Using a development secret. Set it in .env.');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, SECRET, { expiresIn: '7d' });

async function load(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(h.slice(7), SECRET);
    const u = await User.findById(p.id);
    return u && u.active ? u : null;
  } catch { return null; }
}
const optionalAuth = async (req, res, next) => { req.user = await load(req); next(); };
const requireAuth = async (req, res, next) => {
  req.user = await load(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue' });
  next();
};
const isAdmin = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access only' });
const requireAdmin = [requireAuth, isAdmin];
// public reads, admin-only writes
const adminUnlessGet = (req, res, next) => {
  if (req.method === 'GET') return next();
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue' });
  return isAdmin(req, res, next);
};

module.exports = { sign, optionalAuth, requireAuth, requireAdmin, adminUnlessGet };
