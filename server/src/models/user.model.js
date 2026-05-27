const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    roles: {
      type: [String],
      enum: ['student', 'instructor', 'admin'],
      default: ['student'],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'restricted', 'deleted'],
      default: 'pending',
    },
    interests: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    education: {
      type: String,
      default: '',
      trim: true,
    },
    certification: {
      type: String,
      default: '',
      trim: true,
    },
    experience: {
      type: String,
      default: '',
      trim: true,
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative'],
    },
    withdrawableBalance: {
      type: Number,
      default: 0,
      min: [0, 'Withdrawable balance cannot be negative'],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be greater than 5'],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

/** Coerce missing/invalid wallet values so legacy users match schema defaults. */
userSchema.statics.walletAmount = function walletAmount(userDoc) {
  if (!userDoc) {
    return 0;
  }
  const raw = userDoc.walletBalance;
  if (raw === null || raw === undefined) {
    return 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/** Persist default walletBalance for documents created before the field existed. */
userSchema.statics.ensureAllWalletBalances = async function ensureAllWalletBalances() {
  return this.updateMany(
    {
      $or: [
        { walletBalance: { $exists: false } },
        { walletBalance: null },
      ],
    },
    { $set: { walletBalance: 0 } }
  );
};

/** Coerce missing/invalid withdrawable values for legacy users. */
userSchema.statics.withdrawableAmount = function withdrawableAmount(userDoc) {
  if (!userDoc) {
    return 0;
  }
  const raw = userDoc.withdrawableBalance;
  if (raw === null || raw === undefined) {
    return 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
