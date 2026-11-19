# Eventra - Event Management System

Eventra is a web application to create events, register participants, manage attendance and generate reports. It is being built with **Node.js, Express and SQLite**.

## Project Status: Day 2
Participant registration is added on top of the Events API. Reports and the user interface will be added in the coming days.

### Completed
- [x] Project initialised with Node.js and npm
- [x] Express server created (`server.js`)
- [x] SQLite database connected with `events` and `registrations` tables (`db.js`)
- [x] Events API: create, list and delete events (`routes/events.js`)
- [x] Registration API: register and cancel participants, with duplicate-email and capacity checks (`routes/registrations.js`)

### Upcoming
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
| GET | /api/registrations?eventId= | List registrations (optionally for one event) |
| POST | /api/registrations | Register a participant |
| DELETE | /api/registrations/:id | Cancel a registration |

Example request body for `POST /api/registrations`:
```json
{ "eventId": "<event id>", "name": "Aarav Sharma", "email": "aarav@college.edu", "phone": "9876543210" }
```

## Getting Started
1. Install [Node.js](https://nodejs.org) (v18 or newer).
2. Clone the repository: `git clone https://github.com/Tarunnotcompiled/EVENTRA.git`
3. Open the folder in a terminal and run `npm install`
4. Run `npm start`
5. The server runs at http://localhost:3000. Test it by opening http://localhost:3000/api/events

## Author
Tarun, Roll No. ______, Course ______, College ______
