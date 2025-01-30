const express = require('express');
const router = express.Router();
const axios = require('axios');

// User-specific cache with Map
const flightCache = new Map();

// Cache configuration
const CACHE_DURATION = 10000; // 10 seconds in milliseconds
const SEARCH_RADIUS = {
  NEARBY: 25,    // 25km radius for nearby flights
  EXTENDED: 100  // 100km radius for fetching data
};

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

async function fetchFlightData(userId, lat, lon) {
  const now = Date.now();
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  // Check user's cache
  const userCache = flightCache.get(userId);
  if (userCache) {
    const timeDiff = now - userCache.timestamp;
    if (timeDiff < CACHE_DURATION) {
      console.log(`Using cached flight data for user ${userId}`);
      return userCache.data;
    } else {
      // Clean up expired cache
      flightCache.delete(userId);
    }
  }

  // Fetch new data with extended radius
  const bbox = calculateBoundingBox(parsedLat, parsedLon, SEARCH_RADIUS.EXTENDED);
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
  const transformedData = response.data.data.map(transformFlightData);

  // Update user's cache
  flightCache.set(userId, {
    data: transformedData,
    timestamp: now
  });

  // Set cleanup timeout
  setTimeout(() => {
    flightCache.delete(userId);
  }, CACHE_DURATION);

  return transformedData;
}

router.get('/nearby', async (req, res) => {
  const { lat, lon, userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Decode userId if it's encoded
  const decodedUserId = decodeURIComponent(userId);

  try {
    const flights = await fetchFlightData(decodedUserId, lat, lon);

    // Filter flights for nearby radius and altitude
    const visibleFlights = flights.filter(flight => {
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lon),
        flight.geography.latitude,
        flight.geography.longitude
      );
      const hasValidAltitude = flight.geography.altitude && flight.geography.altitude >= 500;
      return hasValidAltitude && distance <= SEARCH_RADIUS.NEARBY;
    });

    res.status(200).json(visibleFlights);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

router.get('/suggestions', async (req, res) => {
  const { lat, lon, userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const flights = await fetchFlightData(userId, lat, lon);

    // Extract unique airlines and destinations
    const airlines = new Map();
    const destinations = new Map();

    flights.forEach(flight => {
      const airlineCode = flight.operating_as || flight.painted_as;
      if (airlineCode) {
        airlines.set(airlineCode, {
          code: airlineCode,
          name: airlineCode
        });
      }

      if (flight.dest_iata) {
        destinations.set(flight.dest_iata, {
          code: flight.dest_iata,
          name: flight.dest_iata
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