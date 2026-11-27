require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./db');
const { Category } = require('./models');
const { optionalAuth, requireAuth, requireAdmin, adminUnlessGet } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// public / customer routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', optionalAuth, adminUnlessGet, require('./routes/events'));
app.get('/api/categories', async (req, res) => res.json(await Category.find().sort({ name: 1 })));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/notifications', requireAuth, require('./routes/notifications'));

// admin-only routes
app.use('/api/registrations', ...requireAdmin, require('./routes/registrations'));
app.use('/api/attendance', ...requireAdmin, require('./routes/attendance'));
app.use('/api/reports', ...requireAdmin, require('./routes/reports'));
app.use('/api/payments', ...requireAdmin, require('./routes/payments'));
app.use('/api/dashboard', ...requireAdmin, require('./routes/dashboard'));
app.use('/api/users', ...requireAdmin, require('./routes/users'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: 'Invalid data' });
  if (err.code === 11000) return res.status(409).json({ error: 'Duplicate entry' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Start the server only after MongoDB is connected
connectDB()
  .then(() => app.listen(PORT, () => console.log(`Eventra running at http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
