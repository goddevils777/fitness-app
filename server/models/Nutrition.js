const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  calories: {
    type: Number,
    required: true,
    min: 0
  },
  time: {
    hour: {
      type: String,
      required: true,
      default: '12'
    },
    minute: {
      type: String,
      required: true,
      default: '00'
    }
  },
  order: {
    type: Number,
    required: true
  }
});

const dayNutritionSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  meals: [mealSchema]
});

const nutritionSchema = new mongoose.Schema({
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
  weekNutrition: [dayNutritionSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Индекс для быстрого поиска
nutritionSchema.index({ clientId: 1, trainerId: 1 });

module.exports = mongoose.model('Nutrition', nutritionSchema);