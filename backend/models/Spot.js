// models/Spot.js
const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  aircraft: {
    iataCode: String,
    icao24: String,
    icaoCode: String,
    regNumber: String
  },
  airline: {
    iataCode: String,
    icaoCode: String
  },
  arrival: {
    iataCode: String,
    icaoCode: String
  },
  departure: {
    iataCode: String,
    icaoCode: String
  },
  flight: {
    iataNumber: String,
    icaoNumber: String,
    number: String
  },
  geography: {
    altitude: Number,
    direction: Number,
    latitude: Number,
    longitude: Number
  },
  speed: {
    horizontal: Number,
    isGround: Number,
    vspeed: Number
  },
  status: String,
  system: {
    squawk: String,
    updated: Number
  }
});

const spotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  flight: flightSchema,
  guessedType: String,
  guessedAirline: String,
  guessedDestination: String,
  isAirlineCorrect: Boolean,
  isDestinationCorrect: Boolean,
  isTypeCorrect: Boolean,
  bonusXP: { type: Number, default: 0 },
  baseXP: { type: Number, default: 5 },
});

spotSchema.index({ userId: 1, timestamp: -1 });
spotSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Spot', spotSchema);