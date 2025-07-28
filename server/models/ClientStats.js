const mongoose = require('mongoose');

const exerciseResultSchema = new mongoose.Schema({
  exerciseName: {
    type: String,
    required: true,
    trim: true
  },
  weight: {
    type: Number,
    required: true
  },
  reps: {
    type: Number,
    default: 0
  },
  sets: {
    type: Number,
    default: 0
  }
});

const clientStatsSchema = new mongoose.Schema({
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
  currentWeight: {
    type: Number,
    default: 0
  },
  exerciseResults: [exerciseResultSchema],
  workoutStarted: {
    type: Boolean,
    default: false
  },
  workoutStartTime: {
    type: Date,
    default: null
  },
  lastWorkoutDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Индекс для быстрого поиска
clientStatsSchema.index({ clientId: 1, trainerId: 1 });

module.exports = mongoose.model('ClientStats', clientStatsSchema);