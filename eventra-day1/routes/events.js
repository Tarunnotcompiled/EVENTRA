const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');

// GET /api/events - list all events with registered count
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.eventId = e.id) AS registered
    FROM events e ORDER BY e.date`).all();
  res.json(rows);
});

// POST /api/events - create an event
router.post('/', (req, res) => {
  const { name, date, venue, category } = req.body;
  const cap = parseInt(req.body.cap, 10);
  if (!name || !date || !venue || !(cap > 0)) {
    return res.status(400).json({ error: 'Name, date, venue and a capacity above 0 are required' });
  }
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO events (id,name,date,venue,cap,category) VALUES (?,?,?,?,?,?)')
    .run(id, name.trim(), date, venue.trim(), cap, category || '');
  res.status(201).json({ id, name, date, venue, cap, category });
});

// DELETE /api/events/:id - delete an event (its registrations are removed too)
router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Event not found' });
  res.json({ ok: true });
});

// POST /api/events/seed - load sample data for demos
router.post('/seed', (req, res) => {
  const a = crypto.randomUUID(), b = crypto.randomUUID();
  const ins = db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?)');
  const reg = db.prepare('INSERT INTO registrations VALUES (?,?,?,?,?,?)');
  const names = ['Aarav Sharma','Diya Verma','Kabir Singh','Meera Nair','Rohan Gupta','Sana Khan','Ishaan Patel','Tara Joshi'];
  db.transaction(() => {
    ins.run(a, 'Tech Fest 2026', '2026-12-05', 'Main Auditorium', 6, 'Competition');
    ins.run(b, 'Data Science Workshop', '2026-11-20', 'Lab 3', 40, 'Workshop');
    names.forEach((n, i) => reg.run(crypto.randomUUID(), i < 6 ? a : b, n,
      n.split(' ')[0].toLowerCase() + '@college.edu', '98' + (10000000 + i * 1234567), i % 3 !== 0 ? 1 : 0));
  })();
  res.status(201).json({ ok: true });
});

module.exports = router;
