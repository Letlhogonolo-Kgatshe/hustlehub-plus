/**
 * incomeRoutes.js
 *
 * Request flow:
 *   Client -> requireAuth (401) -> requireRole('freelancer') (403) -> controller
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getIncome } = require('../controllers/incomeController');

const router = express.Router();

// freelancer only: total earned from their own transactions, plus the most recent ones
router.get('/api/income', requireAuth, requireRole('freelancer'), getIncome);

module.exports = router;
