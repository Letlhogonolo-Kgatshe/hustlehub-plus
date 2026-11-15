const mongoose = require('mongoose');
const { GIG_LIMITS } = require('./Gig');

// payments are simulated in Part 2. Real statuses (paid, refunded) can be added in Part 3.
const TRANSACTION_STATUSES = Object.freeze(['simulated-paid']);

const transactionSchema = new mongoose.Schema(
  {
    // unique: one transaction per booking, never two
    booking: {
      type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, immutable: true,
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    // rands, copied from the booking price. Income and tax are calculated from this.
    amount: {
      type: Number, required: true, min: GIG_LIMITS.priceMin, max: GIG_LIMITS.priceMax, immutable: true,
    },
    status: { type: String, enum: TRANSACTION_STATUSES, default: 'simulated-paid', required: true },
  },
  {
    // a financial record is never edited, so there is no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
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

// GET /api/income adds up and lists one freelancer's transactions, newest first
transactionSchema.index({ freelancer: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Transaction, TRANSACTION_STATUSES };
