const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');

const ClientStats = sequelize.define('ClientStats', {
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  currentWeight: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  exerciseResults: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  workoutStarted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  workoutStartTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastWorkoutDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = ClientStats;