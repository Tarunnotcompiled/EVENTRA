const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sign, requireAuth } = require('../auth');

const okEmail = (e) => /^\S+@\S+\.\S+$/.test(e);
const strong = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

// simple login rate limit: 10 failed attempts per 15 minutes per IP + email
const fails = new Map();
const recent = (k) => (fails.get(k) || []).filter((t) => Date.now() - t < 15 * 60 * 1000);

// POST /api/auth/register - customer sign up
router.post('/register', async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  if (!name || !okEmail(email)) return res.status(400).json({ error: 'Enter your name and a valid email' });
  if (!strong(b.password)) return res.status(400).json({ error: 'Password needs 8 or more characters, with letters and numbers' });
  if (await User.exists({ email })) return res.status(409).json({ error: 'That email is already registered' });
  const user = await User.create({ name, email, phone: String(b.phone || '').trim(), password: await bcrypt.hash(b.password, 10), role: 'customer' });
  res.status(201).json({ token: sign(user), user });
});

// POST /api/auth/login - admin and customer login
router.post('/login', async (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const key = req.ip + email;
  if (recent(key).length >= 10) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  const user = await User.findOne({ email }).select('+password');
  const ok = user && (await bcrypt.compare(String(req.body.password || ''), user.password));
  if (!ok) { fails.set(key, [...recent(key), Date.now()]); return res.status(401).json({ error: 'Invalid email or password' }); }
  if (!user.active) return res.status(403).json({ error: 'This account has been disabled' });
  res.json({ token: sign(user), user });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => res.json(req.user));

// PUT /api/auth/me - update own profile (and optionally the password)
router.put('/me', requireAuth, async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const user = await User.findById(req.user._id).select('+password');
  user.name = name;
  user.phone = String(b.phone || '').trim();
  if (b.newPassword) {
    if (!(await bcrypt.compare(String(b.currentPassword || ''), user.password))) return res.status(400).json({ error: 'Current password is incorrect' });
    if (!strong(b.newPassword)) return res.status(400).json({ error: 'New password needs 8 or more characters, with letters and numbers' });
    user.password = await bcrypt.hash(b.newPassword, 10);
  }
  await user.save();
  res.json(user);
});

module.exports = router;
