const router = require('express').Router();
const { Event, User, Booking, Payment } = require('../models');

// Payments are SIMULATED for the demo. No real money is collected.
const STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];

// GET /api/payments - all payments with customer and event names
router.get('/', async (req, res) => {
  const ps = await Payment.find().sort({ createdAt: -1 });
  const bs = await Booking.find({ _id: { $in: ps.map((p) => p.bookingId) } });
  const [us, evs] = await Promise.all([
    User.find({ _id: { $in: ps.map((p) => p.userId) } }),
    Event.find({ _id: { $in: bs.map((b) => b.eventId) } }),
  ]);
  const bm = Object.fromEntries(bs.map((b) => [b._id, b]));
  const um = Object.fromEntries(us.map((u) => [u._id, u]));
  const em = Object.fromEntries(evs.map((e) => [e._id, e]));
  res.json(ps.map((p) => {
    const b = bm[p.bookingId] || {};
    return {
      id: p._id, paymentId: p.paymentId, bookingCode: b.bookingId || '-', customer: (um[p.userId] || {}).name || '-',
      event: (em[b.eventId] || {}).name || '-', amount: p.amount, method: p.method, date: p.createdAt, status: p.status,
    };
  }));
});

// PATCH /api/payments/:id - admin changes a payment status
router.patch('/:id', async (req, res) => {
  const status = (req.body || {}).status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid payment status' });
  const p = await Payment.findById(String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Payment not found' });
  p.status = status; await p.save();
  const b = await Booking.findById(p.bookingId);
  if (b) {
    b.paymentStatus = status;
    if (status === 'Paid' && b.bookingStatus === 'Pending') b.bookingStatus = 'Confirmed';
    await b.save();
  }
  res.json(p);
});

module.exports = router;
