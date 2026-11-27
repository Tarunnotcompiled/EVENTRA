const router = require('express').Router();
const crypto = require('crypto');
const { Event, User, Booking, Payment, Notification } = require('../models');
const { requireAuth, requireAdmin } = require('../auth');
const { taken } = require('../seats');

const today = () => new Date().toLocaleDateString('en-CA');
const code = (p) => p + Date.now().toString(36).toUpperCase() + crypto.randomInt(100, 999);
const note = (userId, title, message) => Notification.create({ userId, title, message });
const STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];

// Cancellation rule: customers can cancel up to 2 days before the event.
const canCancel = (b, e) =>
  !['Cancelled', 'Completed'].includes(b.bookingStatus) && !!e.date && (new Date(e.date + 'T00:00') - Date.now()) / 864e5 >= 2;

async function shape(list) {
  const [evs, us] = await Promise.all([
    Event.find({ _id: { $in: [...new Set(list.map((b) => b.eventId))] } }),
    User.find({ _id: { $in: [...new Set(list.map((b) => b.userId))] } }),
  ]);
  const em = Object.fromEntries(evs.map((e) => [e._id, e]));
  const um = Object.fromEntries(us.map((u) => [u._id, u]));
  return list.map((b) => {
    const e = em[b.eventId] || {}, u = um[b.userId] || {};
    return {
      id: b._id, bookingId: b.bookingId, eventId: b.eventId, event: e.name || '(deleted event)', eventDate: e.date || '',
      venue: e.venue || '', location: e.location || '', customer: u.name || '', email: u.email || '', phone: u.phone || '',
      tickets: b.tickets, amount: b.totalAmount, bookingStatus: b.bookingStatus, paymentStatus: b.paymentStatus,
      date: b.createdAt, cancellable: canCancel(b, e),
    };
  });
}

async function cancel(b, by) {
  b.bookingStatus = 'Cancelled';
  const p = await Payment.findOne({ bookingId: b._id });
  if (p && p.status === 'Paid') { p.status = 'Refunded'; await p.save(); b.paymentStatus = 'Refunded'; }
  else if (p && p.status === 'Pending') { p.status = 'Failed'; await p.save(); b.paymentStatus = 'Failed'; }
  await b.save();
  await note(b.userId, 'Booking cancelled', `Booking ${b.bookingId} was cancelled${by === 'admin' ? ' by the organiser' : ''}.${b.paymentStatus === 'Refunded' ? ' Your (demo) payment is marked as refunded.' : ''}`);
}

// POST /api/bookings - customer books an event
router.post('/', requireAuth, async (req, res) => {
  const body = req.body || {};
  const eventId = String(body.eventId || '');
  const tickets = parseInt(body.tickets, 10);
  if (!(tickets >= 1 && tickets <= 10)) return res.status(400).json({ error: 'Choose between 1 and 10 tickets' });
  const e = await Event.findById(eventId);
  if (!e || e.status !== 'Published') return res.status(404).json({ error: 'This event is not available' });
  if (e.date < today()) return res.status(409).json({ error: 'This event has already taken place' });
  const left = e.cap - (await taken(eventId));
  if (tickets > left) return res.status(409).json({ error: left > 0 ? `Only ${left} seat(s) left` : 'This event is sold out' });

  const amount = tickets * (e.price || 0), free = amount === 0;
  const b = await Booking.create({
    bookingId: code('BK'), userId: req.user._id, eventId, tickets, totalAmount: amount,
    bookingStatus: free ? 'Confirmed' : 'Pending', paymentStatus: free ? 'Paid' : 'Pending',
  });
  await Payment.create({ paymentId: code('PAY'), bookingId: b._id, userId: req.user._id, amount, method: free ? 'Free' : 'UPI', status: free ? 'Paid' : 'Pending' });
  await note(req.user._id, free ? 'Booking confirmed' : 'Booking received', `${tickets} ticket(s) for ${e.name}. Booking ID ${b.bookingId}.${free ? '' : ' Complete the (demo) payment to confirm.'}`);
  res.status(201).json((await shape([b]))[0]);
});

// GET /api/bookings - customers see their own, admin sees all (filters: eventId, status, from, to)
router.get('/', requireAuth, async (req, res) => {
  const f = {}, q = req.query;
  if (req.user.role !== 'admin') f.userId = req.user._id;
  else {
    if (q.eventId) f.eventId = String(q.eventId);
    if (STATUSES.includes(q.status)) f.bookingStatus = q.status;
    if (q.from || q.to) {
      f.createdAt = {};
      if (q.from) f.createdAt.$gte = new Date(String(q.from));
      if (q.to) f.createdAt.$lte = new Date(String(q.to) + 'T23:59:59');
    }
  }
  res.json(await shape(await Booking.find(f).sort({ createdAt: -1 })));
});

async function mine(req, res) {
  const b = await Booking.findById(String(req.params.id));
  if (!b || (req.user.role !== 'admin' && b.userId !== req.user._id)) { res.status(404).json({ error: 'Booking not found' }); return null; }
  return b;
}

// POST /api/bookings/:id/pay - SIMULATED payment (no real money is collected)
router.post('/:id/pay', requireAuth, async (req, res) => {
  const b = await mine(req, res); if (!b) return;
  const method = ['UPI', 'Card', 'NetBanking'].includes((req.body || {}).method) ? req.body.method : 'UPI';
  if (b.bookingStatus === 'Cancelled') return res.status(409).json({ error: 'This booking was cancelled' });
  if (b.paymentStatus === 'Paid') return res.status(409).json({ error: 'Already paid' });
  const p = await Payment.findOne({ bookingId: b._id });
  Object.assign(p, { status: 'Paid', method, createdAt: new Date() }); await p.save();
  b.paymentStatus = 'Paid'; if (b.bookingStatus === 'Pending') b.bookingStatus = 'Confirmed'; await b.save();
  await note(b.userId, 'Payment received (demo)', `Booking ${b.bookingId} is confirmed.`);
  res.json((await shape([b]))[0]);
});

// POST /api/bookings/:id/cancel - customer cancellation (rule: 2+ days before the event)
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const b = await mine(req, res); if (!b) return;
  const e = (await Event.findById(b.eventId)) || {};
  if (req.user.role !== 'admin' && !canCancel(b, e)) return res.status(409).json({ error: 'Bookings can be cancelled up to 2 days before the event' });
  await cancel(b, req.user.role === 'admin' ? 'admin' : 'customer');
  res.json((await shape([b]))[0]);
});

// PATCH /api/bookings/:id - admin updates the booking status
router.patch('/:id', ...requireAdmin, async (req, res) => {
  const b = await Booking.findById(String(req.params.id));
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  const status = (req.body || {}).bookingStatus;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid booking status' });
  if (status === 'Cancelled') await cancel(b, 'admin');
  else { b.bookingStatus = status; await b.save(); await note(b.userId, 'Booking updated', `Booking ${b.bookingId} is now ${status}.`); }
  res.json((await shape([b]))[0]);
});

module.exports = router;
