const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
      maxlength: 150,
    },
    code: {
      type: String,
      required: [true, 'Hospital code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 10,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Hospital email is required'],
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: true, // Only verified hospitals can issue tokens
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'active',
    },
    settings: {
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' },
      maxTokensPerDay: { type: Number, default: 200 },
      avgConsultationMinutes: { type: Number, default: 15 },
      allowOnlineBooking: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

hospitalSchema.index({ 'address.city': 1, status: 1, isVerified: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
