/**
 * gigRoutes.js
 *
 * Request flow:
 *   Client -> requireAuth (401) -> requireRole (403) -> validation (400) -> controller (404 for not yours)
 *
 * '/api/gigs/mine' is declared before '/api/gigs/:id' so "mine" is not
 * treated as an id.
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { gigRules } = require('../middleware/gigValidators');
const { validate } = require('../middleware/validators');
const {
  createGig, listMyGigs, getGig, updateGig, deleteGig, browseGigs,
} = require('../controllers/gigController');

const router = express.Router();

// clients browse and search
router.get('/api/gigs', requireAuth, requireRole('client', 'admin'), browseGigs);

// freelancer-only
router.get('/api/gigs/mine', requireAuth, requireRole('freelancer'), listMyGigs);
router.post('/api/gigs', requireAuth, requireRole('freelancer'), gigRules, validate, createGig);
router.put('/api/gigs/:id', requireAuth, requireRole('freelancer'), gigRules, validate, updateGig);
router.delete('/api/gigs/:id', requireAuth, requireRole('freelancer'), deleteGig);

// detail page: any logged-in user
router.get('/api/gigs/:id', requireAuth, getGig);

module.exports = router;