const mongoose = require('mongoose');

const frequencyItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  count: { type: Number, required: true }
});

const locationStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String },
    city: { type: String },
    country: { type: String }
  },
  topAirlines: [frequencyItemSchema],
  topAircraftTypes: [frequencyItemSchema],
  lastAnalysis: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

locationStatsSchema.index({ userId: 1, 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('LocationStats', locationStatsSchema);