const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['patient', 'staff', 'admin'],
      default: 'patient',
    },
    // For staff members:
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    staffRole: {
      type: String,
      enum: ['admin', 'doctor', 'nurse', 'receptionist', 'staff', null],
      default: null,
    },
    // Global staff may operate every hospital in the platform. It is a plain
    // staff permission (never platform admin) and is only ever granted by
    // src/scripts/grantGlobalStaff.js; no API accepts it from a client.
    isGlobalStaff: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    // Account lifecycle. Documents created before this field existed have no
    // value, which is treated as 'active' everywhere.
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    suspendedReason: {
      type: String,
      default: '',
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Transform to JSON (strip sensitive fields)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  // Accounts created before the status field existed are active.
  if (!obj.status) obj.status = 'active';
  return obj;
};

module.exports = mongoose.model('User', userSchema);

