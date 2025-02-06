const express = require('express');
const router = express.Router();
const LocationStats = require('../models/LocationStats');
const { getBestAirlineName } = require('../utils/airlineMapping');
const axios = require('axios');

// Search radius configuration
const SEARCH_RADIUS = 25; // 25km radius for nearby flights

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBoundingBox(lat, lon, distance) {
  const latDelta = distance / 111.32;
  const lonDelta = distance / (111.32 * Math.cos(lat * (Math.PI / 180)));
  
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta
  };
}

// Get or analyze location stats
router.post('/analyze', async (req, res) => {
  const { userId, lat, lon } = req.body;
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  try {
    // Calculate bounding box for 25km radius
    const bbox = calculateBoundingBox(parsedLat, parsedLon, SEARCH_RADIUS);

    // Make API request to FlightRadar24 for 25km area
    const config = {
      method: 'get',
      url: `https://fr24api.flightradar24.com/api/live/flight-positions/full?bounds=${bbox.north},${bbox.south},${bbox.west},${bbox.east}`,
      headers: {
        'Accept': 'application/json',
        'Accept-Version': 'v1',
        'Authorization': `Bearer ${process.env.FLIGHTRADAR24_API_KEY}`
      }
    };

    const response = await axios.request(config);
    const flights = response.data.data.map(flight => ({
      flight: flight.flight,
      type: flight.type,
      operating_as: flight.operating_as,
      painted_as: flight.painted_as,
      timestamp: new Date(flight.timestamp),
      geography: {
        latitude: flight.lat,
        longitude: flight.lon,
        altitude: flight.alt
      }
    }));

    // Filter flights from the last hour with valid altitude
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const validFlights = flights.filter(flight => {
      const isWithinTimeWindow = flight.timestamp >= oneHourAgo;
      const hasValidAltitude = flight.geography.altitude && flight.geography.altitude >= 500;
      return isWithinTimeWindow && hasValidAltitude;
    });

    // Count frequencies
    const airlineFrequency = {};
    const aircraftTypeFrequency = {};

    validFlights.forEach(flight => {
      // Count airlines using proper name mapping
      const airline = getBestAirlineName(flight.operating_as, flight.painted_as);
      if (airline && airline !== 'Unknown') {
        airlineFrequency[airline] = (airlineFrequency[airline] || 0) + 1;
      }

      // Count aircraft types
      if (flight.type && flight.type !== 'N/A') {
        aircraftTypeFrequency[flight.type] = (aircraftTypeFrequency[flight.type] || 0) + 1;
      }
    });

    // Get top 5 for each category
    const topAirlines = Object.entries(airlineFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topAircraftTypes = Object.entries(aircraftTypeFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Save or update location stats
    const locationStats = await LocationStats.findOneAndUpdate(
      {
        userId,
        'location.latitude': parsedLat,
        'location.longitude': parsedLon
      },
      {
        $set: {
          topAirlines,
          topAircraftTypes,
          lastUpdated: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Return response with additional metadata
    res.json({
      ...locationStats.toObject(),
      metadata: {
        totalFlightsAnalyzed: validFlights.length,
        timeWindowStart: oneHourAgo,
        radiusKm: SEARCH_RADIUS
      }
    });
  } catch (error) {
    console.error('Error analyzing location stats:', error);
    res.status(500).json({ error: 'Failed to analyze location stats' });
  }
});

// Get saved location stats
router.get('/:userId', async (req, res) => {
  try {
    const stats = await LocationStats.find({ userId: req.params.userId })
      .sort({ lastUpdated: -1 })
      .limit(1);
    
    res.json(stats[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location stats' });
  }
});

module.exports = router;