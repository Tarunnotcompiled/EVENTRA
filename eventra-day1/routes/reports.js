const router = require('express').Router();
const { Event, Registration } = require('../models');

const pct = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : 0);

// ---------- CSV helpers ----------
// Escapes a value for CSV. Also neutralises spreadsheet formula injection
// (cells starting with = + - @) by prefixing a single quote.
function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function sendCsv(res, filename, headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  rows.forEach((r) => lines.push(r.map(csvCell).join(',')));
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  // BOM so Excel opens UTF-8 names correctly
  res.send('\uFEFF' + lines.join('\r\n') + '\r\n');
}

// ---------- Shared query (MongoDB aggregation) ----------
async function eventStats() {
  const [events, agg] = await Promise.all([
    Event.find().sort({ date: 1 }),
    Registration.aggregate([{
      $group: {
        _id: '$eventId',
        registered: { $sum: 1 },
        present: { $sum: { $cond: ['$present', 1, 0] } },
      },
    }]),
  ]);
  const byEvent = Object.fromEntries(agg.map((a) => [a._id, a]));
  return events.map((e) => {
    const registered = byEvent[e._id]?.registered || 0;
    const present = byEvent[e._id]?.present || 0;
    return {
      id: e._id, name: e.name, date: e.date, venue: e.venue, category: e.category, cap: e.cap,
      registered, present,
      absent: registered - present,
      seatsLeft: e.cap - registered,
      fillRate: pct(registered, e.cap),
      attendanceRate: pct(present, registered),
    };
  });
}

// GET /api/reports/summary - overall totals
router.get('/summary', async (req, res) => {
  const stats = await eventStats();
  const totalCap = stats.reduce((s, e) => s + e.cap, 0);
  const registered = stats.reduce((s, e) => s + e.registered, 0);
  const present = stats.reduce((s, e) => s + e.present, 0);
  const best = stats.filter((e) => e.registered > 0).sort((a, b) => b.attendanceRate - a.attendanceRate)[0];
  res.json({
    totalEvents: stats.length,
    totalCapacity: totalCap,
    totalRegistrations: registered,
    totalPresent: present,
    totalAbsent: registered - present,
    overallFillRate: pct(registered, totalCap),
    overallAttendanceRate: pct(present, registered),
    fullEvents: stats.filter((e) => e.registered >= e.cap).length,
    bestAttendedEvent: best ? { id: best.id, name: best.name, attendanceRate: best.attendanceRate } : null,
  });
});

// GET /api/reports/events - per-event stats
router.get('/events', async (req, res) => res.json(await eventStats()));

// GET /api/reports/categories - stats grouped by category
router.get('/categories', async (req, res) => {
  const map = {};
  (await eventStats()).forEach((e) => {
    const key = e.category || 'Uncategorised';
    const c = (map[key] ||= { category: key, events: 0, registered: 0, present: 0, cap: 0 });
    c.events++; c.registered += e.registered; c.present += e.present; c.cap += e.cap;
  });
  res.json(Object.values(map).map((c) => ({
    ...c,
    fillRate: pct(c.registered, c.cap),
    attendanceRate: pct(c.present, c.registered),
  })));
});

// GET /api/reports/event/:id - full report for one event
router.get('/event/:id', async (req, res) => {
  const id = String(req.params.id);
  const stat = (await eventStats()).find((e) => e.id === id);
  if (!stat) return res.status(404).json({ error: 'Event not found' });
  const regs = await Registration.find({ eventId: id }).sort({ name: 1 });
  res.json({
    ...stat,
    participants: regs.map((r) => ({ id: r._id, name: r.name, email: r.email, phone: r.phone, present: r.present })),
  });
});

// GET /api/reports/export/events.csv - all events with stats
router.get('/export/events.csv', async (req, res) => {
  const rows = (await eventStats()).map((e) => [
    e.name, e.date, e.venue, e.category, e.cap, e.registered, e.present, e.absent,
    e.fillRate + '%', e.attendanceRate + '%',
  ]);
  sendCsv(res, 'eventra-events.csv',
    ['Event', 'Date', 'Venue', 'Category', 'Capacity', 'Registered', 'Present', 'Absent', 'Fill Rate', 'Attendance Rate'],
    rows);
});

// GET /api/reports/export/registrations.csv[?eventId=...] - participant list
router.get('/export/registrations.csv', async (req, res) => {
  const eventId = req.query.eventId ? String(req.query.eventId) : '';
  if (eventId && !(await Event.exists({ _id: eventId }))) {
    return res.status(404).json({ error: 'Event not found' });
  }
  const [events, regs] = await Promise.all([
    Event.find(),
    Registration.find(eventId ? { eventId } : {}),
  ]);
  const ev = Object.fromEntries(events.map((e) => [e._id, e]));
  const rows = regs
    .filter((r) => ev[r.eventId])
    .sort((a, b) => ev[a.eventId].date.localeCompare(ev[b.eventId].date)
      || ev[a.eventId].name.localeCompare(ev[b.eventId].name)
      || a.name.localeCompare(b.name))
    .map((r) => [ev[r.eventId].name, ev[r.eventId].date, r.name, r.email, r.phone, r.present ? 'Present' : 'Absent']);
  sendCsv(res, 'eventra-registrations.csv',
    ['Event', 'Date', 'Participant', 'Email', 'Phone', 'Attendance'], rows);
});

module.exports = router;
