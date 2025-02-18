const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getBestAirlineName } = require('../utils/airlineMapping');
const { getAirportName } = require('../utils/airportMapping.js')

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

    // Extract unique airlines, destinations, and aircraft types
    const airlines = new Map();
    const destinations = new Map();
    const aircraftTypes = new Map();

    flights.forEach(flight => {
      const airlineCode = flight.operating_as || flight.painted_as;
      if (airlineCode) {
        airlines.set(airlineCode, {
          code: airlineCode,
          name: getBestAirlineName(flight.operating_as, flight.painted_as)
        });
      }

      if (flight.dest_iata) {
        destinations.set(flight.dest_iata, {
          code: flight.dest_iata,
          name: getAirportName(flight.dest_iata) || flight.dest_iata
        });
      }

      // Add aircraft type mapping
      if (flight.type) {
        // Create a human-readable name for the aircraft type
        let typeName = flight.type;
        const typeMapping = {
          'A20N': 'Airbus A320neo',
          'A21N': 'Airbus A321neo',
          'A318': 'Airbus A318',
          'A319': 'Airbus A319',
          'A320': 'Airbus A320',
          'A321': 'Airbus A321',
          'A332': 'Airbus A330-200',
          'A333': 'Airbus A330-300',
          'A338': 'Airbus A330-800neo',
          'A339': 'Airbus A330-900neo',
          'A359': 'Airbus A350-900',
          'A35K': 'Airbus A350-1000',
          'A388': 'Airbus A380-800',
          'B737': 'Boeing 737',
          'B738': 'Boeing 737-800',
          'B739': 'Boeing 737-900',
          'B38M': 'Boeing 737 MAX 8',
          'B39M': 'Boeing 737 MAX 9',
          'B744': 'Boeing 747-400',
          'B748': 'Boeing 747-8',
          'B752': 'Boeing 757-200',
          'B753': 'Boeing 757-300',
          'B762': 'Boeing 767-200',
          'B763': 'Boeing 767-300',
          'B764': 'Boeing 767-400',
          'B772': 'Boeing 777-200',
          'B773': 'Boeing 777-300',
          'B77W': 'Boeing 777-300ER',
          'B788': 'Boeing 787-8',
          'B789': 'Boeing 787-9',
          'B78X': 'Boeing 787-10',
          'E190': 'Embraer E190',
          'E195': 'Embraer E195',
          'E290': 'Embraer E190-E2',
          'E295': 'Embraer E195-E2'
        };
        
        aircraftTypes.set(flight.type, {
          code: flight.type,
          name: typeMapping[flight.type] || flight.type
        });
      }
    });

    const result = {
      airlines: Array.from(airlines.values()),
      destinations: Array.from(destinations.values()),
      aircraftTypes: Array.from(aircraftTypes.values())
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flight suggestions' });
  }
});

module.exports = router;