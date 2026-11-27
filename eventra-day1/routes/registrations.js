const router = require('express').Router();
const { Event, Registration } = require('../models');
const { taken } = require('../seats');

// GET /api/registrations?eventId=...
router.get('/', async (req, res) => {
  const filter = req.query.eventId ? { eventId: String(req.query.eventId) } : {};
  res.json(await Registration.find(filter));
});

// POST /api/registrations - register a participant
router.post('/', async (req, res) => {
  const body = req.body || {};
  const eventId = String(body.eventId || '');
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'A name and a valid email are required' });
  }
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const count = await taken(eventId);
  if (count >= event.cap) return res.status(409).json({ error: 'This event is full' });

  try {
    const reg = await Registration.create({ eventId, name, email, phone });
    res.status(201).json(reg);
  } catch (err) {
    // unique index on (eventId, email)
    if (err.code === 11000) return res.status(409).json({ error: 'That email is already registered' });
    throw err;
  }
});

// DELETE /api/registrations/:id - cancel a registration
router.delete('/:id', async (req, res) => {
  const r = await Registration.findByIdAndDelete(String(req.params.id));
  if (!r) return res.status(404).json({ error: 'Registration not found' });
  res.json({ ok: true });
});

module.exports = router;
