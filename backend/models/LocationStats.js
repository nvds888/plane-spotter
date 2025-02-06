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
    longitude: { type: Number, required: true }
  },
  topAirlines: [frequencyItemSchema],
  topAircraftTypes: [frequencyItemSchema],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for querying by userId and location
locationStatsSchema.index({ userId: 1, 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('LocationStats', locationStatsSchema);