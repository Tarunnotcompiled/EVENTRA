const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/reports', require('./routes/reports'));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. Create a .env file using .env.example.');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
  app.listen(PORT, () => console.log(`Eventra running at http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Unable to start Eventra:', err.message);
  process.exit(1);
});
