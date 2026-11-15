const mongoose = require('mongoose');

// A short lock per client and gig, so a double click or a retried request
// cannot book (and charge for) the same gig twice within a few seconds.
const bookingLockSchema = new mongoose.Schema(
  {
    // "<clientId>:<gigId>", unique because it is the _id
    _id: { type: String },
    until: { type: Date, required: true },
  },
  { versionKey: false }
);

// MongoDB removes expired locks by itself (it checks about once a minute)
bookingLockSchema.index({ until: 1 }, { expireAfterSeconds: 0 });

const BookingLock = mongoose.model('BookingLock', bookingLockSchema);

/**
 * Takes the lock for this client and gig, or returns false if it is still held.
 * The filter only matches an expired lock; if a live one exists, the upsert
 * tries to insert the same _id and MongoDB refuses it (E11000). That makes
 * the check and the write a single atomic step, even for simultaneous requests.
 */
async function acquireBookingLock(clientId, gigId, windowMs) {
  const now = new Date();
  try {
    await BookingLock.updateOne(
      { _id: `${clientId}:${gigId}`, until: { $lte: now } },
      { $set: { until: new Date(now.getTime() + windowMs) } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    if (err && err.code === 11000) return false;
    throw err;
  }
}

function releaseBookingLock(clientId, gigId) {
  return BookingLock.deleteOne({ _id: `${clientId}:${gigId}` });
}

module.exports = { BookingLock, acquireBookingLock, releaseBookingLock };
