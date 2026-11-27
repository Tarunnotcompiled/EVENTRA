const mongoose = require('mongoose');
const crypto = require('crypto');

// Send "id" (not "_id" / "__v") to the frontend, so the API stays the same as before.
const toJSON = {
  transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.password; return ret; },
};
const opts = { versionKey: false, toJSON };
const uuid = () => crypto.randomUUID();

const eventSchema = new mongoose.Schema({
  _id:      { type: String, default: uuid },
  name:     { type: String, required: true, trim: true },
  date:     { type: String, required: true },
  venue:    { type: String, required: true, trim: true },
  cap:      { type: Number, required: true, min: 1 },
  category: { type: String, default: '', trim: true },
  // added for the customer website (all optional, so old events still work)
  description: { type: String, default: '', trim: true },
  location:    { type: String, default: '', trim: true },
  image:       { type: String, default: '', trim: true },
  startTime:   { type: String, default: '' },
  endTime:     { type: String, default: '' },
  price:       { type: Number, default: 0, min: 0 },
  status:      { type: String, enum: ['Published', 'Draft', 'Cancelled'], default: 'Published' },
}, opts);

const registrationSchema = new mongoose.Schema({
  _id:     { type: String, default: uuid },
  eventId: { type: String, required: true, ref: 'Event' },
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  phone:   { type: String, default: '', trim: true },
  present: { type: Boolean, default: false },
}, opts);

// One email can register only once per event
registrationSchema.index({ eventId: 1, email: 1 }, { unique: true });

const userSchema = new mongoose.Schema({
  _id:       { type: String, default: uuid },
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, select: false },
  phone:     { type: String, default: '', trim: true },
  role:      { type: String, enum: ['admin', 'customer'], default: 'customer' },
  active:    { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, opts);

const bookingSchema = new mongoose.Schema({
  _id:           { type: String, default: uuid },
  bookingId:     { type: String, required: true, unique: true },
  userId:        { type: String, required: true, ref: 'User', index: true },
  eventId:       { type: String, required: true, ref: 'Event', index: true },
  tickets:       { type: Number, required: true, min: 1, max: 10 },
  totalAmount:   { type: Number, required: true, min: 0 },
  bookingStatus: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
  createdAt:     { type: Date, default: Date.now },
}, opts);

const paymentSchema = new mongoose.Schema({
  _id:       { type: String, default: uuid },
  paymentId: { type: String, required: true, unique: true },
  bookingId: { type: String, required: true, ref: 'Booking', index: true },
  userId:    { type: String, required: true, ref: 'User' },
  amount:    { type: Number, required: true, min: 0 },
  method:    { type: String, enum: ['UPI', 'Card', 'NetBanking', 'Free'], default: 'UPI' },
  status:    { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
}, opts);

const categorySchema = new mongoose.Schema({
  _id:         { type: String, default: uuid },
  name:        { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
}, opts);

const notificationSchema = new mongoose.Schema({
  _id:       { type: String, default: uuid },
  userId:    { type: String, required: true, ref: 'User', index: true },
  title:     { type: String, required: true },
  message:   { type: String, default: '' },
  isRead:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, opts);

module.exports = {
  User: mongoose.model('User', userSchema),
  Booking: mongoose.model('Booking', bookingSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  Category: mongoose.model('Category', categorySchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Event: mongoose.model('Event', eventSchema),
  Registration: mongoose.model('Registration', registrationSchema),
};
