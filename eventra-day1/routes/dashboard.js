const router = require('express').Router();
const { Event, User, Booking, Payment } = require('../models');

const today = () => new Date().toLocaleDateString('en-CA');
function lastMonths(n) {
  const out = [], now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return out;
}

// GET /api/dashboard - every number comes from the database
router.get('/', async (req, res) => {
  const t = today(), now = new Date(), since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fmt = '%Y-%m';
  const [totalEvents, upcoming, completed, customers, bookings, cancelled, rev, pending, revM, bkM, recent, upEv, newUsers] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ date: { $gte: t }, status: 'Published' }),
    Event.countDocuments({ date: { $lt: t } }),
    User.countDocuments({ role: 'customer' }),
    Booking.countDocuments(),
    Booking.countDocuments({ bookingStatus: 'Cancelled' }),
    Payment.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Payment.countDocuments({ status: 'Pending' }),
    Payment.aggregate([{ $match: { status: 'Paid', createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt' } }, t: { $sum: '$amount' } } }]),
    Booking.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt' } }, n: { $sum: 1 } } }]),
    Booking.find().sort({ createdAt: -1 }).limit(5),
    Event.find({ date: { $gte: t }, status: 'Published' }).sort({ date: 1 }).limit(5),
    User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(5),
  ]);
  const [evs, us] = await Promise.all([
    Event.find({ _id: { $in: recent.map((b) => b.eventId) } }),
    User.find({ _id: { $in: recent.map((b) => b.userId) } }),
  ]);
  const em = Object.fromEntries(evs.map((e) => [e._id, e.name]));
  const um = Object.fromEntries(us.map((u) => [u._id, u.name]));
  const rm = Object.fromEntries(revM.map((r) => [r._id, r.t]));
  const bm = Object.fromEntries(bkM.map((r) => [r._id, r.n]));
  res.json({
    stats: {
      totalEvents, upcomingEvents: upcoming, completedEvents: completed, customers, bookings, cancelled,
      revenue: rev[0] ? rev[0].t : 0, pendingPayments: pending,
    },
    revenueByMonth: lastMonths(6).map((m) => ({ month: m, total: rm[m] || 0 })),
    bookingsByMonth: lastMonths(6).map((m) => ({ month: m, count: bm[m] || 0 })),
    recentBookings: recent.map((b) => ({ bookingId: b.bookingId, customer: um[b.userId] || '-', event: em[b.eventId] || '-', status: b.bookingStatus, amount: b.totalAmount })),
    upcomingEvents: upEv.map((e) => ({ id: e._id, name: e.name, date: e.date, location: e.location || e.venue })),
    recentCustomers: newUsers.map((u) => ({ id: u._id, name: u.name, email: u.email, joined: u.createdAt })),
  });
});

module.exports = router;
