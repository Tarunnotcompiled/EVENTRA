const router = require('express').Router();
const { Notification } = require('../models');

// GET /api/notifications - my latest notifications
router.get('/', async (req, res) => {
  res.json(await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20));
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: String(req.params.id), userId: req.user._id }, { isRead: true }, { new: true });
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  res.json(n);
});

module.exports = router;
