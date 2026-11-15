const { body } = require('express-validator');
const mongoose = require('mongoose');

// the only field a client sends when booking. Price and freelancer come from the database.
const bookingRules = [
  body('gigId')
    .exists({ values: 'falsy' }).withMessage('Gig id is required').bail()
    // a plain string only: rejects objects like {"$ne":null}
    .isString().withMessage('Gig id must be text').bail()
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage('Gig id is not valid'),
];

module.exports = { bookingRules };
