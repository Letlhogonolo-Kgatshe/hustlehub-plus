/**
 * incomeController.js
 *
 * A freelancer's income and estimated tax, calculated by the server from
 * their transactions.
 *
 * Security notes:
 *   - Only transactions where freelancer equals the logged-in user
 *     (req.user.id from the verified token) are counted. Nothing in the
 *     request can change whose income is returned.
 *   - Totals and tax are always calculated here, never sent in by the client.
 *
 * Money:
 *   Amounts are stored in rands. The total is added up in whole cents and
 *   converted back, so it never drifts (e.g. R10.10 + R20.20 is exactly R30.30).
 *
 * Tax (Part 3):
 *   `total` stays all-time income. Tax is worked out per SARS tax year, so a
 *   separate query loads only this tax year's transactions and taxService adds
 *   taxYearIncome, estimatedTax, net and a monthly breakdown. See the README's
 *   "Tax estimation" section for the rules and a worked example.
 */

const mongoose = require('mongoose');
const { Transaction } = require('../models/Transaction');
const { TAX_CONFIG } = require('../config/taxConfig');
const { buildIncomeSummary } = require('../services/taxService');

const RECENT_LIMIT = 5;
// statuses that count as money earned; Part 3 adds real payment statuses here
const EARNED_STATUSES = ['simulated-paid'];

// Tax year boundaries: from 1 March (inclusive) to 1 March the next year (exclusive)
const TAX_YEAR_START = new Date(`${TAX_CONFIG.periodStart}T00:00:00Z`);
const TAX_YEAR_END = new Date(TAX_YEAR_START);
TAX_YEAR_END.setUTCFullYear(TAX_YEAR_END.getUTCFullYear() + 1);

// GET /api/income  (freelancer)
async function getIncome(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.user.id)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // aggregate() does not convert strings to ObjectIds, so convert here
    const earned = { freelancer: new mongoose.Types.ObjectId(String(req.user.id)), status: { $in: EARNED_STATUSES } };

    const [totals, recent, taxYearTransactions] = await Promise.all([
      Transaction.aggregate([
        { $match: earned },
        {
          $group: {
            _id: null,
            totalCents: { $sum: { $round: [{ $multiply: ['$amount', 100] }, 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.find(earned)
        .sort({ createdAt: -1 })
        .limit(RECENT_LIMIT)
        .populate('booking', 'gigTitle')
        .lean(),
      // only this tax year's earned transactions, and only the two fields tax needs
      Transaction.find({ ...earned, createdAt: { $gte: TAX_YEAR_START, $lt: TAX_YEAR_END } })
        .select('amount createdAt')
        .lean(),
    ]);

    const { totalCents = 0, count = 0 } = totals[0] || {};
    const tax = buildIncomeSummary(taxYearTransactions);

    return res.status(200).json({
      currency: 'ZAR',
      total: totalCents / 100,
      count,
      recent: recent.map((t) => ({
        id: String(t._id),
        bookingId: t.booking ? String(t.booking._id) : null,
        gigTitle: t.booking ? t.booking.gigTitle : null,
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
      })),
      // Part 3: taxYear, taxYearIncome, estimatedTax, net, taxBeforeRebate, rebate,
      // marginalRate, effectiveRate, threshold, belowThreshold, monthly, assumptions, source
      ...tax,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getIncome };