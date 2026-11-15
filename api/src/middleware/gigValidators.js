const { body } = require('express-validator');
const { GIG_CATEGORIES, GIG_LIMITS } = require('../models/Gig');

const gigRules = [
  body('title')
    .exists({ values: 'falsy' }).withMessage('Title is required').bail()
    .isString().withMessage('Title must be text').bail()
    .trim()
    .isLength({ min: GIG_LIMITS.titleMin, max: GIG_LIMITS.titleMax })
    .withMessage(`Title must be between ${GIG_LIMITS.titleMin} and ${GIG_LIMITS.titleMax} characters`),
  body('description')
    .exists({ values: 'falsy' }).withMessage('Description is required').bail()
    .isString().withMessage('Description must be text').bail()
    .trim()
    .isLength({ min: GIG_LIMITS.descriptionMin, max: GIG_LIMITS.descriptionMax })
    .withMessage(`Description must be between ${GIG_LIMITS.descriptionMin} and ${GIG_LIMITS.descriptionMax} characters`),
  body('price')
    .exists({ values: 'null' }).withMessage('Price is required').bail()
    // a real number only: rejects "100" and objects like {"$gt":0}
    .custom((value) => typeof value === 'number' && Number.isFinite(value))
    .withMessage('Price must be a number').bail()
    .custom((value) => value >= GIG_LIMITS.priceMin && value <= GIG_LIMITS.priceMax)
    .withMessage(`Price must be between ${GIG_LIMITS.priceMin} and ${GIG_LIMITS.priceMax}`),
  body('category')
    .exists({ values: 'falsy' }).withMessage('Category is required').bail()
    .isString().withMessage('Category must be text').bail()
    .isIn(GIG_CATEGORIES).withMessage(`Category must be one of: ${GIG_CATEGORIES.join(', ')}`),
];

module.exports = { gigRules };