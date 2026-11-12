# Eventra - Event Management System

Eventra is a web application to create events, register participants, manage attendance and generate reports. It is being built with **Node.js, Express and SQLite**.

## Project Status: Day 1
Project setup, database design and the Events API are done. Registration, attendance, reports and the user interface will be added in the coming days.

### Completed
- [x] Project initialised with Node.js and npm
- [x] Express server created (`server.js`)
- [x] SQLite database connected with `events` and `registrations` tables (`db.js`)
- [x] Events API: create, list and delete events (`routes/events.js`)

### Upcoming
- [ ] Day 2: Participant registration API
- [ ] Day 3: Attendance API
- [ ] Day 4: Reports and CSV export
- [ ] Day 5: User interface and final documentation

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |

## Database Schema
- **events**: id, name, date, venue, cap, category
- **registrations**: id, eventId (FK to events), name, email, phone, present. Email is unique per event.

## API Endpoints (so far)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/events | List all events with registered count |
| POST | /api/events | Create an event |
| DELETE | /api/events/:id | Delete an event and its registrations |

Example request body for `POST /api/events`:
```json
{ "name": "Tech Fest", "date": "2026-12-05", "venue": "Main Auditorium", "cap": 100, "category": "Competition" }
```

## Getting Started
1. Install [Node.js](https://nodejs.org) (v18 or newer).
2. Clone this repository and open the folder in a terminal.
3. Run `npm install`
4. Run `npm start`
5. The server runs at http://localhost:3000. Test it with `http://localhost:3000/api/events`.

## Author
Your Name, Roll No., Course, College
