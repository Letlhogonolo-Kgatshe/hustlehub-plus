/**
 * Profile Routes Controller
 * Author: Funi
 * 
 * A minimal protected route used to demonstrate and test JWT-based route
 * protection for HustleHub+.
 *
 * Purpose:
 *   This route exists purely as a proof-of-concept: it shows that
 *   requireAuth correctly blocks unauthenticated requests and correctly
 *   allows requests carrying a valid token through, exposing the decoded
 *   user identity on success. It is not a real feature of the system --
 *   later parts of the POE will add real protected routes (gigs,
 *   bookings, etc.) that follow this same pattern.
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
 
const router = express.Router();

router.get('/api/profile', requireAuth, (req, res) => {
  res.status(200).json({
    message: `Hello, user ${req.user.id}`,
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});
 
module.exports = router;
