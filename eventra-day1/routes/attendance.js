const router = require('express').Router();
const { Event, Registration } = require('../model');

// Accepts true/false, 1/0, "true"/"false". Returns null if invalid.
function parsePresent(v) {
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  if (v === false || v === 0 || v === '0' || v === 'false') return false;
  return null;
}

// GET /api/attendance?eventId=... - attendance list for an event, with summary
router.get('/', async (req, res) => {
  const eventId = String(req.query.eventId || '');
  if (!eventId) return res.status(400).json({ error: 'eventId query parameter is required' });

  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const regs = await Registration.find({ eventId }).sort({ name: 1 });
  const present = regs.filter((r) => r.present).length;
  res.json({
    event,
    summary: {
      registered: regs.length,
      present,
      absent: regs.length - present,
      attendanceRate: regs.length ? Math.round((present / regs.length) * 1000) / 10 : 0,
    },
    registrations: regs,
  });
});

// PATCH /api/attendance/:id - mark one registration present/absent.
// Body: { "present": true }. If "present" is omitted, the current value is toggled.
router.patch('/:id', async (req, res) => {
  const reg = await Registration.findById(String(req.params.id));
  if (!reg) return res.status(404).json({ error: 'Registration not found' });

  const body = req.body || {};
  let value;
  if (body.present === undefined) {
    value = !reg.present;
  } else {
    value = parsePresent(body.present);
    if (value === null) return res.status(400).json({ error: '"present" must be true or false' });
  }
  reg.present = value;
  await reg.save();
  res.json(reg);
});

// POST /api/attendance/event/:eventId/mark-all - mark everyone present/absent
// Body: { "present": true }  (defaults to true)
router.post('/event/:eventId/mark-all', async (req, res) => {
  const event = await Event.findById(String(req.params.eventId));
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const body = req.body || {};
  const value = body.present === undefined ? true : parsePresent(body.present);
  if (value === null) return res.status(400).json({ error: '"present" must be true or false' });

  const r = await Registration.updateMany({ eventId: event._id }, { present: value });
  res.json({ ok: true, updated: r.matchedCount, present: value });
});

module.exports = router;
