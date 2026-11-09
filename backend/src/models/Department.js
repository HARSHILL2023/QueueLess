const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Hospital ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      uppercase: true,
      trim: true,
      maxlength: 10,
    },
    description: {
      type: String,
      default: '',
    },
    floor: {
      type: String,
      default: 'Ground Floor',
    },
    roomNumber: {
      type: String,
      default: '101',
    },
    avgWaitMinutes: {
      type: Number,
      default: 15,
      min: 1,
      max: 180,
    },
    maxTokensPerDay: {
      type: Number,
      default: 100,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

departmentSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
