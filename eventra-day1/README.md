# Eventra - Event Management System

Eventra is a web application to create events, register participants, manage attendance and generate reports. It is built with **Node.js, Express and MongoDB**.

## Project Status: Complete
All five days are done: Events API, Registration API, Attendance API, Reports with CSV export, and a browser user interface. Data is stored in **MongoDB** using Mongoose.

### Completed
- [x] Project initialised with Node.js and npm
- [x] Express server created (`server.js`)
- [x] MongoDB connected with Mongoose; `Event` and `Registration` models (`db.js`, `models.js`)
- [x] Events API: create, list and delete events (`routes/events.js`)
- [x] Registration API: register and cancel participants, with duplicate-email and capacity checks (`routes/registrations.js`)
- [x] Attendance API: mark present/absent, toggle, mark all, per-event summary (`routes/attendance.js`)
- [x] Reports and CSV export: summary, per-event and per-category stats, CSV downloads (`routes/reports.js`)
- [x] User interface: premium Bordo, Green and Cream design with dashboard, events, bookings, customers and reports (`public/index.html`)

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose ODM) |
| Frontend | HTML, CSS and vanilla JavaScript (Fetch API), served by Express |

## Database (MongoDB collections)
- **events**: _id, name, date, venue, cap, category
- **registrations**: _id, eventId (reference to an event), name, email, phone, present. A unique index on (eventId, email) stops the same email registering twice for one event.

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/events | List all events with registered count |
| POST | /api/events | Create an event |
| PUT | /api/events/:id | Edit an event |
| DELETE | /api/events/:id | Delete an event and its registrations |
| POST | /api/events/seed | Load sample data for demos |
| GET | /api/registrations?eventId= | List registrations (optionally for one event) |
| POST | /api/registrations | Register a participant |
| DELETE | /api/registrations/:id | Cancel a registration |
| GET | /api/attendance?eventId= | Attendance list for an event with present/absent summary |
| PATCH | /api/attendance/:id | Mark one participant present/absent (toggles if no body) |
| POST | /api/attendance/event/:eventId/mark-all | Mark all participants of an event present/absent |
| GET | /api/reports/summary | Overall totals, fill rate and attendance rate |
| GET | /api/reports/events | Stats for every event |
| GET | /api/reports/categories | Stats grouped by category |
| GET | /api/reports/event/:id | Full report for one event with participant list |
| GET | /api/reports/export/events.csv | Download events report as CSV |
| GET | /api/reports/export/registrations.csv?eventId= | Download participant list as CSV |

## Getting Started
1. Install [Node.js](https://nodejs.org) (v18 or newer).
2. Set up MongoDB, either:
   - **Local:** install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and keep it running, or
   - **Cloud:** create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and copy its connection string.
3. Clone the repository: `git clone https://github.com/Tarunnotcompiled/EVENTRA.git`
4. Open the folder in a terminal and run `npm install`
5. Copy `.env.example` to `.env` and put your MongoDB connection string in `MONGODB_URI` (for local MongoDB the default works without a `.env` file).
6. Run `npm start`
7. Open http://localhost:3000 in your browser. Click **Load demo data** on the Events page to try it.

## Authentication and roles
- Passwords are hashed with bcrypt. Login returns a JWT that the pages send in the `Authorization: Bearer <token>` header.
- **Admin routes** (events create/edit/delete, registrations, attendance, reports, payments, dashboard, users) need an admin token. Customers get `403`.
- Customers can register, log in, book events, pay (simulated), cancel (up to 2 days before the event) and see their history.

## Demo data and credentials (development only)
Run `npm run seed` once. It is safe to run again, it never creates duplicates. It creates 1 admin, 10 customers, 7 categories, 12 events, 20 bookings, 20 payments and notifications in MongoDB.

| Role | Email | Password |
|---|---|---|
| Admin | admin@eventpro.com | Admin@123 |
| Customer | customer@gmail.com | Customer@123 |

Payments are **simulated**. No real money is collected. Set a long random `JWT_SECRET` in `.env` before any real use.

## Pages
- Customer website (home): http://localhost:3000/
- Admin panel: http://localhost:3000/admin  (admins who log in on the customer site are sent here automatically)

## More API endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/auth/register | public | Customer sign up |
| POST | /api/auth/login | public | Admin or customer login |
| GET/PUT | /api/auth/me | logged in | View or edit own profile |
| PUT | /api/events/:id | admin | Edit an event (includes price, status, description) |
| GET | /api/categories | public | Event categories |
| POST | /api/bookings | logged in | Book an event (checks capacity) |
| GET | /api/bookings | logged in | Own bookings, or all for admin (filters: eventId, status, from, to) |
| POST | /api/bookings/:id/pay | owner | Simulated payment |
| POST | /api/bookings/:id/cancel | owner/admin | Cancel a booking |
| PATCH | /api/bookings/:id | admin | Update booking status |
| GET/PATCH | /api/payments | admin | List payments, change payment status |
| GET | /api/dashboard | admin | Dashboard statistics from the database |
| GET/PATCH | /api/users | admin | List customers, enable or disable accounts |
| GET | /api/notifications | logged in | Own notifications |

## Demo guide for the professor
1. Run `npm run seed`, then `npm start`.
2. Open MongoDB (Compass or Atlas) and show the collections: users, events, bookings, payments, categories, notifications.
3. Open http://localhost:3000/admin and sign in as admin. Show the dashboard numbers, then Events (create, edit, delete), Customer orders and Payments.
4. Open http://localhost:3000/ in another window and log in as the customer. Browse events, book one, pay (demo), and open My bookings.
5. Back in the admin window, refresh: the new booking and payment appear, and the dashboard numbers change.

## Author
Tarun, Roll No. ______, Course ______, College ______
