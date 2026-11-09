const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['staff', 'admin'],
      default: 'staff',
    },
    staffRole: {
      type: String,
      enum: ['doctor', 'nurse', 'receptionist', 'admin', 'staff'],
      default: 'staff',
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

invitationSchema.index({ email: 1, hospitalId: 1, status: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
