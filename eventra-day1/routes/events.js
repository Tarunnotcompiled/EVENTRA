const router = require('express').Router();
const { Event, Registration } = require('../model');

// GET /api/events - list all events with registered count
router.get('/', async (req, res) => {
  const [events, counts] = await Promise.all([
    Event.find().sort({ date: 1 }),
    Registration.aggregate([{ $group: { _id: '$eventId', n: { $sum: 1 } } }]),
  ]);
  const byEvent = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json(events.map((e) => ({ ...e.toJSON(), registered: byEvent[e._id] || 0 })));
});

// POST /api/events - create an event
router.post('/', async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const date = String(body.date || '').trim();
  const venue = String(body.venue || '').trim();
  const cap = parseInt(body.cap, 10);
  if (!name || !date || !venue || !(cap > 0)) {
    return res.status(400).json({ error: 'Name, date, venue and a capacity above 0 are required' });
  }
  const event = await Event.create({ name, date, venue, cap, category: String(body.category || '') });
  res.status(201).json(event);
});

// DELETE /api/events/:id - delete an event (its registrations are removed too)
router.delete('/:id', async (req, res) => {
  const event = await Event.findByIdAndDelete(String(req.params.id));
  if (!event) return res.status(404).json({ error: 'Event not found' });
  await Registration.deleteMany({ eventId: event._id });
  res.json({ ok: true });
});

// POST /api/events/seed - load sample data for demos
router.post('/seed', async (req, res) => {
  const a = await Event.create({ name: 'Tech Fest 2026', date: '2026-12-05', venue: 'Main Auditorium', cap: 6, category: 'Competition' });
  const b = await Event.create({ name: 'Data Science Workshop', date: '2026-11-20', venue: 'Lab 3', cap: 40, category: 'Workshop' });
  const names = ['Aarav Sharma', 'Diya Verma', 'Kabir Singh', 'Meera Nair', 'Rohan Gupta', 'Sana Khan', 'Ishaan Patel', 'Tara Joshi'];
  await Registration.insertMany(names.map((n, i) => ({
    eventId: i < 6 ? a._id : b._id,
    name: n,
    email: n.split(' ')[0].toLowerCase() + '@college.edu',
    phone: '98' + (10000000 + i * 1234567),
    present: i % 3 !== 0,
  })));
  res.status(201).json({ ok: true });
});

module.exports = router;
