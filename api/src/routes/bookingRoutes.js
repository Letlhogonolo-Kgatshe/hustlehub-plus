/**
 * bookingRoutes.js
 *
 * Request flow:
 *   POST: Client -> bookingLimiter (429) -> requireAuth (401) -> requireRole (403)
 *               -> validation (400) -> controller (404 if the gig does not exist)
 *   GET:  Client -> requireAuth (401) -> requireRole (403) -> controller (filters by role)
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { bookingLimiter } = require('../middleware/rateLimiters');
const { bookingRules } = require('../middleware/bookingValidators');
const { validate } = require('../middleware/validators');
const { createBooking, listBookings } = require('../controllers/bookingController');

const router = express.Router();

// clients book a gig; this also records the simulated payment
router.post('/api/bookings', bookingLimiter, requireAuth, requireRole('client'), bookingRules, validate, createBooking);

// every role, but each only sees the bookings they are part of (admin sees all)
router.get('/api/bookings', requireAuth, requireRole('client', 'freelancer', 'admin'), listBookings);

module.exports = router;
