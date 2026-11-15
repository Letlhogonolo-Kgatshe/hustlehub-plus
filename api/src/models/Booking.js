const mongoose = require('mongoose');
const { GIG_LIMITS } = require('./Gig');

// confirmed: set when the booking is made. completed and cancelled are kept for Part 3.
const BOOKING_STATUSES = Object.freeze(['confirmed', 'completed', 'cancelled']);

const bookingSchema = new mongoose.Schema(
  {
    // gig, client, freelancer, title and price are set once by the controller and can never change
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true, immutable: true },
    // copied from the gig at booking time, so renaming or deleting the gig does not change history
    gigTitle: {
      type: String, required: true, trim: true, maxlength: GIG_LIMITS.titleMax, immutable: true,
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    // copied from the gig at booking time, so a later price change does not rewrite history
    price: {
      type: Number, required: true, min: GIG_LIMITS.priceMin, max: GIG_LIMITS.priceMax, immutable: true,
    },
    status: { type: String, enum: BOOKING_STATUSES, default: 'confirmed', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// GET /api/bookings lists newest first for one client or one freelancer
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ freelancer: 1, createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { Booking, BOOKING_STATUSES };
