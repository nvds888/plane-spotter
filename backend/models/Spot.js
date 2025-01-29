const mongoose = require('mongoose'); // Add this line at the top

// In Spot.js
const flightSchema = new mongoose.Schema({
  hex: String,
  flight: String,
  type: String,
  alt: Number,
  speed: Number,
  operator: String,
  lat: Number,
  lon: Number
});

const spotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  flight: flightSchema,
  guessedType: String,
  guessedAltitudeRange: String,
  isTypeCorrect: Boolean,
  isAltitudeCorrect: Boolean,
  bonusXP: { type: Number, default: 0 },
  baseXP: { type: Number, default: 5 },
});

spotSchema.index({ userId: 1, timestamp: -1 }); // For friend spots feed
spotSchema.index({ timestamp: -1 }); 

module.exports = mongoose.model('Spot', spotSchema);