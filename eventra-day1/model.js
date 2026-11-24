const mongoose = require('mongoose');
const crypto = require('crypto');

// Send "id" (not "_id" / "__v") to the frontend, so the API stays the same as before.
const toJSON = {
  transform: (doc, ret) => { ret.id = ret._id; delete ret._id; return ret; },
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

module.exports = {
  Event: mongoose.model('Event', eventSchema),
  Registration: mongoose.model('Registration', registrationSchema),
};