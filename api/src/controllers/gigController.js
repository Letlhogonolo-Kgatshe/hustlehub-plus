/**
 * gigController.js
 *
 * Gig CRUD for freelancers plus a browse/search endpoint for clients.
 *
 * Security notes:
 *   - The owner is always taken from the verified token (req.user.id),
 *     never from the request body, so a freelancer cannot create a gig
 *     for someone else.
 *   - Update and delete look the gig up by BOTH id and owner. Another
 *     freelancer's gig therefore looks exactly like a gig that does not
 *     exist (404), so ids cannot be probed to discover other people's gigs.
 *   - Only whitelisted fields are copied from the body (no mass assignment).
 *   - Search input must be a plain string and is regex-escaped, so
 *     query-string operators such as ?q[$ne]=x or "(.*)" cannot be used
 *     to inject database operators or slow patterns.
 *   - Browse responses return the gig and the freelancer's id only; no
 *     user email or any other user field is exposed.
 */

const mongoose = require('mongoose');
const { Gig, GIG_CATEGORIES } = require('../models/Gig');

const NOT_FOUND = { error: 'Gig not found' };
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const isValidId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// the only fields a caller may set
function pickGigFields(body) {
  const { title, description, price, category } = body;
  return { title, description, price, category };
}

// POST /api/gigs  (freelancer)
async function createGig(req, res, next) {
  try {
    const gig = await Gig.create({ ...pickGigFields(req.body), freelancer: req.user.id });
    return res.status(201).json({ message: 'Gig created', gig });
  } catch (err) {
    return next(err);
  }
}

// GET /api/gigs/mine  (freelancer): the caller's own gigs
async function listMyGigs(req, res, next) {
  try {
    const gigs = await Gig.find({ freelancer: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ gigs });
  } catch (err) {
    return next(err);
  }
}

// GET /api/gigs/:id  (any logged-in user): one gig, for the detail page
async function getGig(req, res, next) {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json(NOT_FOUND);
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json(NOT_FOUND);
    return res.status(200).json({ gig });
  } catch (err) {
    return next(err);
  }
}

// PUT /api/gigs/:id  (freelancer, owner only)
async function updateGig(req, res, next) {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json(NOT_FOUND);

    const gig = await Gig.findOneAndUpdate(
      { _id: req.params.id, freelancer: req.user.id },
      { $set: pickGigFields(req.body) },
      { new: true, runValidators: true }
    );
    if (!gig) return res.status(404).json(NOT_FOUND);

    return res.status(200).json({ message: 'Gig updated', gig });
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/gigs/:id  (freelancer, owner only)
async function deleteGig(req, res, next) {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json(NOT_FOUND);

    const gig = await Gig.findOneAndDelete({ _id: req.params.id, freelancer: req.user.id });
    if (!gig) return res.status(404).json(NOT_FOUND);

    return res.status(200).json({ message: 'Gig deleted' });
  } catch (err) {
    return next(err);
  }
}

// GET /api/gigs?q=logo&category=design&page=1&limit=20  (client, admin)
async function browseGigs(req, res, next) {
  try {
    const { q, category, page, limit } = req.query;
    const filter = {};

    if (q !== undefined) {
      if (typeof q !== 'string' || q.length > 100) {
        return res.status(400).json({ message: 'Search text must be plain text of at most 100 characters' });
      }
      if (q.trim()) {
        const pattern = { $regex: escapeRegex(q.trim()), $options: 'i' };
        filter.$or = [{ title: pattern }, { description: pattern }];
      }
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || !GIG_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: `Category must be one of: ${GIG_CATEGORIES.join(', ')}` });
      }
      filter.category = category;
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const [gigs, total] = await Promise.all([
      Gig.find(filter).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
      Gig.countDocuments(filter),
    ]);

    return res.status(200).json({ gigs, page: pageNumber, limit: pageSize, total });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createGig, listMyGigs, getGig, updateGig, deleteGig, browseGigs };