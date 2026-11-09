const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: Number,
      required: true,
    },
    tokenDisplay: {
      type: String,
      required: true, // e.g. "CARD-001"
    },
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
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Queue',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientPhone: {
      type: String,
      default: '',
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'called', 'serving', 'completed', 'cancelled', 'no-show'],
      default: 'waiting',
      index: true,
    },
    estimatedWaitMinutes: {
      type: Number,
      default: 0,
    },
    calledAt: {
      type: Date,
      default: null,
    },
    servedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Concurrency & uniqueness compound index: ensure a token number is strictly unique per queue/date
tokenSchema.index({ hospitalId: 1, departmentId: 1, date: 1, tokenNumber: 1 }, { unique: true });
// Index for fast active token lookups
tokenSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('Token', tokenSchema);
