const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');

const toBool = (r) => ({ ...r, present: !!r.present });

// GET /api/registrations?eventId=...
router.get('/', (req, res) => {
  const rows = req.query.eventId
    ? db.prepare('SELECT * FROM registrations WHERE eventId = ?').all(req.query.eventId)
    : db.prepare('SELECT * FROM registrations').all();
  res.json(rows.map(toBool));
});

// POST /api/registrations - register a participant
router.post('/', (req, res) => {
  const { eventId, name, phone } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!name || !name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'A name and a valid email are required' });
  }
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const count = db.prepare('SELECT COUNT(*) AS n FROM registrations WHERE eventId = ?').get(eventId).n;
  if (count >= event.cap) return res.status(409).json({ error: 'This event is full' });

  const dup = db.prepare('SELECT 1 FROM registrations WHERE eventId = ? AND email = ?').get(eventId, email);
  if (dup) return res.status(409).json({ error: 'That email is already registered' });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO registrations (id,eventId,name,email,phone,present) VALUES (?,?,?,?,?,0)')
    .run(id, eventId, name.trim(), email, (phone || '').trim());
  res.status(201).json({ id, eventId, name: name.trim(), email, phone: phone || '', present: false });
});

// DELETE /api/registrations/:id - cancel a registration
router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Registration not found' });
  res.json({ ok: true });
});

module.exports = router;
