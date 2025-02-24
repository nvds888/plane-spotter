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
  resetDate: Date,
  completionHistory: [{
    completedAt: { type: Date, default: Date.now },
    xpEarned: { type: Number, required: true }
  }]
});

const badgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  rarity: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now }
});

const subscriptionSchema = new mongoose.Schema({
  active: { type: Boolean, default: false },
  plan: { type: String, enum: ['3', '6', '12'] },  // months
  startDate: Date,
  endDate: Date,
  transactionId: String,
  walletAddress: String,  // Add this to store the user's wallet address
  autoRenew: { type: Boolean, default: false },
  pending: {  // Add this to track pending subscriptions
    plan: String,
    walletAddress: String,
    amount: Number,
    createdAt: Date
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    maxLength: 12,
    validate: {
      validator: function(v) {
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
  algorandAddress: {
    type: String,
    unique: true,
    sparse: true  // Allows null values while maintaining uniqueness
  },
  role: { type: String, default: 'user' },
  spots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Spot'
  }],
  premium: {
    type: Boolean,
    default: false
  },
  subscription: subscriptionSchema,  // Add subscription schema
  dailySpotLimit: {
    type: Number,
    default: 4
  },
  dailySpotLimit: {
    type: Number,
    default: 4  // Default limit for free users
  },
  spotsRemaining: {
    type: Number,
    default: 4  // Initialize with daily limit
  },
  totalXP: { type: Number, default: 0 },
  weeklyXP: { type: Number, default: 0 },
  achievements: [achievementSchema],
  lastDailyReset: { type: Date, default: Date.now },
  lastWeeklyReset: { type: Date, default: Date.now },
  // Remove friends array and add followers/following
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    city: { type: String },    // Add this line
    country: { type: String },
    lastUpdated: { type: Date },
    coordinates: {
      lat: Number,
      lon: Number
    },
  },
  badges: [badgeSchema],
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastSpotDate: { type: Date },
  totalSpots: { type: Number, default: 0 }
},
{ 
  timestamps: true  // This adds createdAt and updatedAt automatically
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);