const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'eventra.db'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    date     TEXT NOT NULL,
    venue    TEXT NOT NULL,
    cap      INTEGER NOT NULL CHECK (cap > 0),
    category TEXT
  );
  CREATE TABLE IF NOT EXISTS registrations (
    id      TEXT PRIMARY KEY,
    eventId TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    email   TEXT NOT NULL,
    phone   TEXT,
    present INTEGER NOT NULL DEFAULT 0,
    UNIQUE (eventId, email)
  );
`);

module.exports = db;
