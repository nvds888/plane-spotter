// models/Spot.js
const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  fr24_id: String,
  flight: String,
  callsign: String,
  type: String,
  reg: String,
  painted_as: String,
  operating_as: String,
  orig_iata: String,
  orig_icao: String,
  dest_iata: String,
  dest_icao: String,
  geography: {
    altitude: Number,
    direction: Number,
    latitude: Number,
    longitude: Number,
    gspeed: Number,
    vspeed: Number
  },
  system: {
    squawk: String,
    timestamp: Date,
    source: String,
    hex: String
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