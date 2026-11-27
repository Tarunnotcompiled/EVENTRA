const router = require('express').Router();
const { User, Booking } = require('../models');

// GET /api/users - all customers with booking counts (admin only)
router.get('/', async (req, res) => {
  const [users, counts] = await Promise.all([
    User.find({ role: 'customer' }).sort({ createdAt: -1 }),
    Booking.aggregate([{ $group: { _id: '$userId', n: { $sum: 1 } } }]),
  ]);
  const m = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json(users.map((u) => ({ ...u.toJSON(), bookings: m[u._id] || 0 })));
});

// GET /api/users/:id - one customer with their booking history
router.get('/:id', async (req, res) => {
  const u = await User.findById(String(req.params.id));
  if (!u) return res.status(404).json({ error: 'Customer not found' });
  res.json({ ...u.toJSON(), bookings: await Booking.find({ userId: u._id }).sort({ createdAt: -1 }) });
});

// PATCH /api/users/:id - enable or disable a customer account
router.patch('/:id', async (req, res) => {
  const u = await User.findOne({ _id: String(req.params.id), role: 'customer' });
  if (!u) return res.status(404).json({ error: 'Customer not found' });
  u.active = !!(req.body || {}).active; await u.save();
  res.json(u);
});

module.exports = router;
