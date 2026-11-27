const { Registration, Booking } = require('./models');

// Seats already used by an event: admin registrations + active customer tickets.
async function taken(eventId) {
  const [reg, held] = await Promise.all([
    Registration.countDocuments({ eventId }),
    Booking.aggregate([
      { $match: { eventId, bookingStatus: { $in: ['Pending', 'Confirmed'] } } },
      { $group: { _id: null, n: { $sum: '$tickets' } } },
    ]),
  ]);
  return reg + (held[0] ? held[0].n : 0);
}

module.exports = { taken };
