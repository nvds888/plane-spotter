const express = require('express');
const router = express.Router();
const axios = require('axios');

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
  // Convert distance from km to degrees (approximate)
  const latDelta = distance / 111.32; // 1 degree ~ 111.32 km
  const lonDelta = distance / (111.32 * Math.cos(lat * (Math.PI / 180)));
  
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta
  };
}

function transformFlightData(flight) {
  return {
    fr24_id: flight.fr24_id,
    flight: flight.flight,
    callsign: flight.callsign,
    type: flight.type,
    reg: flight.reg,
    painted_as: flight.painted_as,
    operating_as: flight.operating_as,
    orig_iata: flight.orig_iata,
    orig_icao: flight.orig_icao,
    dest_iata: flight.dest_iata,
    dest_icao: flight.dest_icao,
    geography: {
      altitude: flight.alt,
      direction: flight.track,
      latitude: flight.lat,
      longitude: flight.lon,
      gspeed: flight.gspeed,
      vspeed: flight.vspeed
    },
    system: {
      squawk: flight.squawk,
      timestamp: new Date(flight.timestamp),
      source: flight.source,
      hex: flight.hex
    }
  };
}

router.get('/nearby', async (req, res) => {
  const { lat, lon } = req.query;
  const searchRadius = 25; // 25km radius

  try {
    const bbox = calculateBoundingBox(parseFloat(lat), parseFloat(lon), searchRadius);
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

    // Filter flights based on distance and altitude
    const visibleFlights = response.data.data
      .filter(flight => {
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lon),
          flight.lat,
          flight.lon
        );
        const hasValidAltitude = flight.alt && flight.alt >= 500;
        return hasValidAltitude && distance <= searchRadius;
      })
      .map(transformFlightData);

    res.status(200).json(visibleFlights);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

router.get('/suggestions', async (req, res) => {
  const { lat, lon } = req.query;
  const searchRadius = 100; // Wider radius for suggestions

  try {
    const bbox = calculateBoundingBox(parseFloat(lat), parseFloat(lon), searchRadius);
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
    const flights = response.data.data;

    // Extract unique airlines and destinations
    const airlines = new Map();
    const destinations = new Map();

    flights.forEach(flight => {
      if (flight.operating_as) {
        airlines.set(flight.operating_as, {
          code: flight.operating_as,
          name: flight.operating_as
        });
      }

      if (flight.dest_iata) {
        destinations.set(flight.dest_iata, {
          code: flight.dest_iata,
          name: flight.dest_icao || flight.dest_iata
        });
      }
    });

    const result = {
      airlines: Array.from(airlines.values()),
      destinations: Array.from(destinations.values())
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flight suggestions' });
  }
});

module.exports = router;