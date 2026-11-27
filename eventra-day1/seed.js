// Run with: npm run seed   (safe to run many times, it never creates duplicates)
// DEVELOPMENT / DEMO ONLY: the accounts below use well-known demo passwords.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const connectDB = require('./db');
const { Event, User, Booking, Payment, Category, Notification } = require('./models');

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ago = (n) => new Date(Date.now() - n * 864e5);
// insert only if the key does not exist yet
const put = (M, key, doc) => M.updateOne(key, { $setOnInsert: { _id: crypto.randomUUID(), ...doc } }, { upsert: true });

const CATS = [
  ['Weddings', 'Wedding ceremonies and receptions'], ['Birthday Parties', 'Birthday celebrations for all ages'],
  ['Corporate Events', 'Annual meets, offsites and launches'], ['Concerts', 'Live music and festivals'],
  ['College Festivals', 'Cultural and technical college fests'], ['Conferences', 'Summits, talks and expos'],
  ['Private Parties', 'Gala nights and private gatherings'],
];
// name, category, city, venue, day offset, price, seats, start, end
const EVENTS = [
  ['Grand Wedding Celebration', 'Weddings', 'Gurugram', 'Royal Palms Banquet', 45, 2500, 200, '18:00', '23:30'],
  ['Tech Innovation Summit', 'Conferences', 'New Delhi', 'Bharat Convention Centre', 20, 1800, 300, '09:30', '17:30'],
  ['College Cultural Fest', 'College Festivals', 'Noida', 'Sector 62 Open Arena', 12, 300, 500, '10:00', '21:00'],
  ['Summer Music Festival', 'Concerts', 'Jaipur', 'Amber Fort Grounds', 60, 2200, 400, '16:00', '23:00'],
  ['Corporate Annual Meet', 'Corporate Events', 'Gurugram', 'Cyber Hub Auditorium', 30, 1200, 150, '10:00', '18:00'],
  ['Birthday Celebration', 'Birthday Parties', 'Chandigarh', 'Lakeview Garden', 9, 800, 60, '17:00', '21:00'],
  ['Startup Business Conference', 'Conferences', 'Mumbai', 'Bandra Business Hub', 75, 3500, 250, '09:00', '18:00'],
  ['Fashion Show', 'Private Parties', 'New Delhi', 'Hauz Khas Studio', 25, 1500, 120, '19:00', '22:30'],
  ['Photography Exhibition', 'College Festivals', 'Noida', 'Art Gallery Hall', -10, 200, 80, '11:00', '19:00'],
  ['Charity Gala Night', 'Private Parties', 'Gurugram', 'Golf Course Road Club', -25, 5000, 100, '19:30', '23:59'],
  ['Food Festival', 'Concerts', 'Jaipur', 'Central Park Lawns', -40, 500, 300, '12:00', '22:00'],
  ['Annual College Fest', 'College Festivals', 'Chandigarh', 'University Ground', 38, 400, 600, '09:00', '22:00'],
];
const NAMES = ['Demo Customer', 'Aarav Sharma', 'Diya Verma', 'Kabir Singh', 'Meera Nair', 'Rohan Gupta', 'Sana Khan', 'Ishaan Patel', 'Tara Joshi', 'Vikram Malhotra'];

(async () => {
  await connectDB();
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const custHash = await bcrypt.hash('Customer@123', 10);

  await put(User, { email: 'admin@eventpro.com' }, { name: 'Admin', password: adminHash, role: 'admin', phone: '9800000000', createdAt: ago(150) });
  for (let i = 0; i < NAMES.length; i++) {
    const email = i === 0 ? 'customer@gmail.com' : NAMES[i].toLowerCase().replace(' ', '.') + '@gmail.com';
    await put(User, { email }, { name: NAMES[i], password: custHash, role: 'customer', phone: '98' + (10000000 + i * 1234567), createdAt: ago(140 - i * 12) });
  }
  for (const [name, description] of CATS) await put(Category, { name }, { description });
  for (const [name, category, city, venue, off, price, cap, start, end] of EVENTS) {
    await put(Event, { name }, { date: day(off), venue, location: city + ', India', cap, category, price, startTime: start, endTime: end, status: 'Published', description: `${name} in ${city}. Book your tickets and enjoy a well organised event.` });
  }

  const events = await Event.find({ name: { $in: EVENTS.map((e) => e[0]) } });
  const em = Object.fromEntries(events.map((e) => [e.name, e]));
  const users = await User.find({ role: 'customer' });
  const um = Object.fromEntries(users.map((u) => [u.name, u]));
  const today = day(0), pattern = ['Confirmed', 'Confirmed', 'Pending', 'Cancelled'];
  const methods = ['UPI', 'Card', 'NetBanking'];

  for (let i = 0; i < 20; i++) {
    const ev = em[EVENTS[i % 12][0]], user = um[NAMES[i % 10]], tickets = 1 + (i % 4);
    const past = ev.date < today;
    const bookingStatus = past ? 'Completed' : pattern[i % 4];
    const paymentStatus = past || bookingStatus === 'Confirmed' ? 'Paid' : bookingStatus === 'Pending' ? 'Pending' : (i % 8 === 3 ? 'Failed' : 'Refunded');
    const createdAt = ago(8 + i * 7), amount = tickets * ev.price;
    const bookingId = 'BK' + (1001 + i);
    await put(Booking, { bookingId }, { userId: user._id, eventId: ev._id, tickets, totalAmount: amount, bookingStatus, paymentStatus, createdAt });
    const b = await Booking.findOne({ bookingId });
    await put(Payment, { paymentId: 'PAY' + (1001 + i) }, { bookingId: b._id, userId: user._id, amount, method: methods[i % 3], status: paymentStatus, createdAt });
    if (bookingStatus === 'Confirmed') await put(Notification, { userId: user._id, title: 'Booking confirmed', message: `Your booking ${bookingId} for ${ev.name} is confirmed.` }, { createdAt });
  }
  console.log('Seed complete:', {
    users: await User.countDocuments(), events: await Event.countDocuments(), bookings: await Booking.countDocuments(),
    payments: await Payment.countDocuments(), categories: await Category.countDocuments(), notifications: await Notification.countDocuments(),
  });
  console.log('Demo admin: admin@eventpro.com / Admin@123   Demo customer: customer@gmail.com / Customer@123 (development only)');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
