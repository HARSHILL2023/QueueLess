const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'closed'],
      default: 'active',
    },
    totalIssued: {
      type: Number,
      default: 0,
    },
    currentServingTokenNumber: {
      type: Number,
      default: 0,
    },
    currentServingTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
      default: null,
    },
    lastCalledTokenNumber: {
      type: Number,
      default: 0,
    },
    totalServed: {
      type: Number,
      default: 0,
    },
    totalCancelled: {
      type: Number,
      default: 0,
    },
    totalNoShow: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

queueSchema.index({ hospitalId: 1, departmentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Queue', queueSchema);
