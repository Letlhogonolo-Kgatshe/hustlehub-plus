const mongoose = require('mongoose');

const GIG_CATEGORIES = Object.freeze([
  'design', 'writing', 'development', 'marketing',
  'video', 'music', 'tutoring', 'other',
]);

const GIG_LIMITS = Object.freeze({
  titleMin: 3,
  titleMax: 100,
  descriptionMin: 10,
  descriptionMax: 2000,
  priceMin: 1,
  priceMax: 100000,
});

const gigSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: GIG_LIMITS.titleMin, maxlength: GIG_LIMITS.titleMax },
    description: { type: String, required: true, trim: true, minlength: GIG_LIMITS.descriptionMin, maxlength: GIG_LIMITS.descriptionMax },
    price: { type: Number, required: true, min: GIG_LIMITS.priceMin, max: GIG_LIMITS.priceMax },
    category: { type: String, required: true, enum: GIG_CATEGORIES },
    // owner: always set from req.user.id in the controller, never from the request body
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Gig = mongoose.model('Gig', gigSchema);

module.exports = { Gig, GIG_CATEGORIES, GIG_LIMITS };