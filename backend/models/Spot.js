const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  // Aircraft details
  aircraftIcao24: String,
  aircraftIcaoCode: String,
  aircraftRegNumber: String,
  
  // Airline details
  airlineIcaoCode: String,
  
  // Flight details
  flightNumber: String,
  flightIcaoNumber: String,
  
  // Geography
  latitude: Number,
  longitude: Number,
  altitude: Number,
  direction: Number,
  
  // Speed
  horizontalSpeed: Number,
  isGround: Boolean,
  verticalSpeed: Number,
  
  // System
  squawk: String,
  status: String,
  lastUpdate: Date
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

spotSchema.index({ userId: 1, timestamp: -1 });
spotSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Spot', spotSchema);