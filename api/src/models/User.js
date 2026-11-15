const mongoose = require('mongoose');

const ROLES = Object.freeze(['client', 'freelancer', 'admin']);
const PUBLIC_ROLES = Object.freeze(['client', 'freelancer']);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // select:false means normal queries never load the hash
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'client', required: true },
    // goes up on logout; tokens carrying an older number stop working
    tokenVersion: { type: Number, default: 0, select: false },
    // account lockout: failed logins since the last success, and when the lock ends
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.tokenVersion;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  }
);

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES, PUBLIC_ROLES };