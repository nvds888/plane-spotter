const express = require('express');
const router = express.Router();
const LocationStats = require('../models/LocationStats');
const { getBestAirlineName } = require('../utils/airlineMapping');
const axios = require('axios');

// Search radius for analysis (200km)
const ANALYSIS_RADIUS = 200;

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

router.post('/analyze', async (req, res) => {
  const { userId, lat, lon } = req.body;
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  try {
    // Calculate bounding box for 200km radius
    const bbox = calculateBoundingBox(parsedLat, parsedLon, ANALYSIS_RADIUS);
    
    // Make API call to get current flights in the area
    const config = {
      method: 'get',
      url: `https://fr24api.flightradar24.com/api/live/flight-positions/full?bounds=${bbox.north},${bbox.south},${bbox.west},${bbox.east}`,
      headers: {
        'Accept': 'application/json',
        'Accept-Version': 'v1',
        'Authorization': `Bearer ${process.env.FLIGHTRADAR24_API_KEY}`
      }
    };

    console.log('Making API request for flight analysis...');
    const response = await axios.request(config);
    const flights = response.data.data || [];
    console.log(`Found ${flights.length} flights in the area`);

    // Count frequencies
    const airlineFrequency = {};
    const aircraftTypeFrequency = {};

    flights.forEach(flight => {
      // Count airlines using proper name mapping
      const airline = getBestAirlineName(flight.operating_as, flight.painted_as);
      if (airline && airline !== 'Unknown') {
        airlineFrequency[airline] = (airlineFrequency[airline] || 0) + 1;
      }

      // Count aircraft types (exclude empty or invalid types)
      if (flight.type && flight.type !== 'N/A' && flight.type.length > 2) {
        aircraftTypeFrequency[flight.type] = (aircraftTypeFrequency[flight.type] || 0) + 1;
      }
    });

    // Get top 5 for each category
    const topAirlines = Object.entries(airlineFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ 
        name, 
        count,
        percentage: Math.round((count / flights.length) * 100)
      }));

    const topAircraftTypes = Object.entries(aircraftTypeFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ 
        name, 
        count,
        percentage: Math.round((count / flights.length) * 100)
      }));

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
        totalFlightsAnalyzed: flights.length,
        timeOfAnalysis: new Date().toISOString(),
        radiusKm: ANALYSIS_RADIUS,
        bounds: bbox
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