const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');

const MealProgress = sequelize.define('MealProgress', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  mealName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isEaten: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  eatenAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = MealProgress;