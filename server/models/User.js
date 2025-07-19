const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  username: String,
  userType: {
    type: String,
    enum: ['trainer', 'client'],
    required: true
  },
  age: Number,
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  inviteCode: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);