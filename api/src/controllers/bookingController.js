/**
 * bookingController.js
 *
 * Booking a gig, with a simulated payment, and listing bookings by role.
 *
 * Security notes:
 *   - Only gigId is read from the body. The price and the freelancer are
 *     loaded from the gig in the database, so a client cannot change what
 *     they pay or who gets paid by editing the request.
 *   - The client is always the logged-in user (req.user.id), never a body field.
 *   - Every booking must have a transaction. MongoDB runs here without a
 *     replica set, so a multi-document transaction is not available; if
 *     saving the transaction fails, the booking is deleted again instead.
 *   - The same client cannot book the same gig twice within 10 seconds, so a
 *     double click or a retried request does not create (and charge) twice.
 *   - Which bookings a user can list is decided only by the role and id in
 *     the verified token. Query-string filters are not accepted, so a client
 *     cannot ask for another client's bookings.
 *   - Listed users show id and email only, no other account fields.
 */

const { Gig } = require('../models/Gig');
const { Booking } = require('../models/Booking');
const { Transaction } = require('../models/Transaction');
const { acquireBookingLock, releaseBookingLock } = require('../models/BookingLock');
const logger = require('../utils/logger');

const REPEAT_WINDOW_MS = 10 * 1000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// the bookings each role may see: clients their own, freelancers those on their gigs, admin all
function bookingsVisibleTo(user) {
  if (user.role === 'client') return { client: user.id };
  if (user.role === 'freelancer') return { freelancer: user.id };
  if (user.role === 'admin') return {};
  return null;
}

const idAndEmail = (user) => (user ? { id: String(user._id), email: user.email } : null);

// POST /api/bookings  (client)
async function createBooking(req, res, next) {
  try {
    const gig = await Gig.findById(req.body.gigId).select('title price freelancer');
    if (!gig) return res.status(404).json({ error: 'Gig not found' });

    if (!(await acquireBookingLock(req.user.id, gig._id, REPEAT_WINDOW_MS))) {
      return res.status(409).json({ error: 'You booked this gig a moment ago. Check My bookings before booking again.' });
    }

    let booking;
    let transaction;
    try {
      booking = await Booking.create({
        gig: gig._id,
        gigTitle: gig.title,
        client: req.user.id,
        freelancer: gig.freelancer,
        price: gig.price,
      });

      try {
        transaction = await Transaction.create({
          booking: booking._id,
          client: booking.client,
          freelancer: booking.freelancer,
          amount: booking.price,
        });
      } catch (err) {
        // never leave a booking without its transaction
        await Booking.deleteOne({ _id: booking._id }).catch((cleanupErr) => {
          logger.error('booking_cleanup_failed', { bookingId: String(booking._id), error: cleanupErr.message });
        });
        throw err;
      }
    } catch (err) {
      // nothing was booked, so the client may try again straight away
      await releaseBookingLock(req.user.id, gig._id).catch(() => {});
      throw err;
    }

    logger.info('booking_created', {
      bookingId: String(booking._id),
      gigId: String(booking.gig),
      clientId: req.user.id,
      freelancerId: String(booking.freelancer),
      amount: booking.price,
    });
    logger.info('transaction_recorded', {
      transactionId: String(transaction._id),
      bookingId: String(booking._id),
      amount: transaction.amount,
      status: transaction.status,
    });

    return res.status(201).json({
      message: 'Booking confirmed. Payment was simulated, no money was charged.',
      booking: {
        id: String(booking._id),
        gig: { id: String(booking.gig), title: booking.gigTitle },
        price: booking.price,
        status: booking.status,
        createdAt: booking.createdAt,
      },
      transaction: {
        id: String(transaction._id),
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/bookings?page=1&limit=20  (client, freelancer, admin)
async function listBookings(req, res, next) {
  try {
    const filter = bookingsVisibleTo(req.user);
    if (!filter) return res.status(403).json({ error: 'You do not have permission to do that' });

    const pageNumber = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('client', 'email')
        .populate('freelancer', 'email')
        .lean(),
      Booking.countDocuments(filter),
    ]);

    // one query for the transactions of this page, matched back by booking id
    const transactions = await Transaction.find({ booking: { $in: bookings.map((b) => b._id) } }, 'booking status').lean();
    const transactionFor = new Map(transactions.map((t) => [String(t.booking), t]));

    return res.status(200).json({
      bookings: bookings.map((b) => {
        const transaction = transactionFor.get(String(b._id));
        return {
          id: String(b._id),
          // the title as it was when booked, even if the gig was renamed or deleted since
          gig: { id: String(b.gig), title: b.gigTitle },
          client: idAndEmail(b.client),
          freelancer: idAndEmail(b.freelancer),
          price: b.price,
          status: b.status,
          createdAt: b.createdAt,
          transaction: transaction ? { id: String(transaction._id), status: transaction.status } : null,
        };
      }),
      page: pageNumber,
      limit: pageSize,
      total,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createBooking, listBookings };
