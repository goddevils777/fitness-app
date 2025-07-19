const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    required: true
  }
});

const dayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  time: {
    hour: {
      type: String,
      required: true,
      default: '18'
    },
    minute: {
      type: String,
      required: true,
      default: '00'
    }
  },
  exercises: [exerciseSchema]
});

const scheduleSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weekSchedule: [dayScheduleSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Индекс для быстрого поиска
scheduleSchema.index({ clientId: 1, trainerId: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);