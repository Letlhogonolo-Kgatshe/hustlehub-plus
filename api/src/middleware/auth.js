/**
 * JWT Authentication middleware for HustleHub+.
 * Author: Funi
 *
 * Purpose:
 *  Protects the routes by requiroing a valid, unexpired Json Web Token (JWT) in the Authorization header of incoming requests.
 *  So any route that should only be accessible to authenticated users should use 'requireAuth' in its route definition.
 *
 * Secuirty Notes:
 *  - The JWT secret is stored in an environment variable (JWT_SECRET) and should never be hardcoded in the source code.
 *  - Both "Invalid" and "Expired" tokens will be rejected with a 401 Unauthorized response.
 *  - Only HS256 tokens are accepted, so a token cannot pick a weaker algorithm.
 *  - The account is looked up on every request. A deleted account, or a token from before
 *    the user logged out (tokenVersion), is rejected straight away instead of working until
 *    it expires, and the role always comes from the database, not from the token.
 *  - On success, req.user is { id, role } for use in downstream route handlers.
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { User } = require('../models/User');

const INVALID_TOKEN = { error: 'Invalid or expired token' };

async function requireAuth(req, res, next){
    const authHeader = req.headers.authorization;

    // Check if the Authorization header is present and starts with 'Bearer '
    if(!authHeader || !authHeader.startsWith('Bearer ')){
     return res.status(401).json({ error: 'Authentication Required' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token part

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
        return res.status(401).json(INVALID_TOKEN);
    }

    try {
        // the account must still exist and the token must not be from before a logout
        const user = mongoose.isValidObjectId(decoded.id)
            ? await User.findById(decoded.id).select('role +tokenVersion').lean()
            : null;
        if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
            return res.status(401).json(INVALID_TOKEN);
        }

        req.user = { id: String(user._id), role: user.role }; // current role, not the one in the token
        return next(); // Proceed to the next middleware or route handler
    } catch (err) {
        return next(err);
    }
}

module.exports = { requireAuth };
