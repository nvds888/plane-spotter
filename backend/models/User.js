const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const achievementSchema = new mongoose.Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  progress: { type: Number, default: 0 },
  target: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  resetDate: Date
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    maxLength: 12,
    validate: {
      validator: function(v) {
        // Must contain at least one letter and one number
        return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{1,12}$/.test(v);
      },
      message: 'Username must be max 12 characters and contain at least one letter and one number'
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: true,
    minLength: [8, 'Password must be at least 8 characters long']
  },
  role: { type: String, default: 'user' },
  spots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Spot'
  }],
  totalXP: { type: Number, default: 0 },
  weeklyXP: { type: Number, default: 0 },
  achievements: [achievementSchema],
  lastDailyReset: { type: Date, default: Date.now },
  lastWeeklyReset: { type: Date, default: Date.now },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    country: { type: String },
    lastUpdated: { type: Date },
    coordinates: {
      lat: Number,
      lon: Number
    }
  }
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);