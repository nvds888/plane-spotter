const express = require('express');
const router = express.Router();
const LocationStats = require('../models/LocationStats');
const { getBestAirlineName } = require('../utils/airlineMapping');
const axios = require('axios');

const ANALYSIS_RADIUS = 200;
const ANALYSIS_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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

async function getLocationInfo(lat, lon) {
  try {
    const response = await axios.get(
      `https://data.vatsim.net/v3/geo/position/${lat}/${lon}`
    );
    return {
      city: response.data.city,
      country: response.data.country
    };
  } catch (error) {
    console.error('Error getting location info:', error);
    return null;
  }
}

router.post('/analyze', async (req, res) => {
  const { userId, lat, lon } = req.body;
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  try {
    // Check if user has analyzed recently
    const lastAnalysis = await LocationStats.findOne({ userId })
      .sort({ lastAnalysis: -1 });

    if (lastAnalysis) {
      const timeSinceLastAnalysis = Date.now() - lastAnalysis.lastAnalysis.getTime();
      if (timeSinceLastAnalysis < ANALYSIS_COOLDOWN) {
        const hoursRemaining = Math.ceil((ANALYSIS_COOLDOWN - timeSinceLastAnalysis) / (1000 * 60 * 60));
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          message: `Please wait ${hoursRemaining} hours before analyzing again`,
          nextAnalysisTime: new Date(lastAnalysis.lastAnalysis.getTime() + ANALYSIS_COOLDOWN)
        });
      }
    }

    // Get location info using the same API as friends route
    const locationInfo = await getLocationInfo(parsedLat, parsedLon);
    
    // Get flights data
    const bbox = calculateBoundingBox(parsedLat, parsedLon, ANALYSIS_RADIUS);
    
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
    const flights = response.data.data || [];

    // Process frequencies
    const airlineFrequency = {};
    const aircraftTypeFrequency = {};

    flights.forEach(flight => {
      const airline = getBestAirlineName(flight.operating_as, flight.painted_as);
      if (airline && airline !== 'Unknown') {
        airlineFrequency[airline] = (airlineFrequency[airline] || 0) + 1;
      }

      if (flight.type && flight.type !== 'N/A' && flight.type.length > 2) {
        aircraftTypeFrequency[flight.type] = (aircraftTypeFrequency[flight.type] || 0) + 1;
      }
    });

    const topAirlines = Object.entries(airlineFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topAircraftTypes = Object.entries(aircraftTypeFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Save analysis with location info
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
          lastAnalysis: new Date(),
          lastUpdated: new Date(),
          location: {
            latitude: parsedLat,
            longitude: parsedLon,
            city: locationInfo?.city || null,
            country: locationInfo?.country || null
          }
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      ...locationStats.toObject(),
      metadata: {
        totalFlightsAnalyzed: flights.length,
        timeOfAnalysis: new Date().toISOString(),
        radiusKm: ANALYSIS_RADIUS
      }
    });
  } catch (error) {
    console.error('Error analyzing location stats:', error);
    res.status(500).json({ error: 'Failed to analyze location stats' });
  }
});

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