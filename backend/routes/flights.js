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
          // Airbus Family
          'A20N': 'A320neo',
          'A21N': 'A321neo',
          'A318': 'A318',
          'A319': 'A319',
          'A320': 'A320',
          'A321': 'A321',
          'A332': 'A330-200',
          'A333': 'A330-300',
          'A338': 'A330-800neo',
          'A339': 'A330-900neo',
          'A342': 'A340-200',
          'A343': 'A340-300',
          'A345': 'A340-500',
          'A346': 'A340-600',
          'A359': 'A350-900',
          'A35K': 'A350-1000',
          'A388': 'A380-800',
        
          // Boeing Family
          'B731': 'B737-100',
          'B732': 'B737-200',
          'B733': 'B737-300',
          'B734': 'B737-400',
          'B735': 'B737-500',
          'B736': 'B737-600',
          'B737': 'B737',
          'B738': 'B737-800',
          'B739': 'B737-900',
          'B37M': 'B737 MAX 7',
          'B38M': 'B737 MAX 8',
          'B39M': 'B737 MAX 9',
          'B3XM': 'B737 MAX 10',
          'B741': 'B747-100',
          'B742': 'B747-200',
          'B743': 'B747-300',
          'B744': 'B747-400',
          'B748': 'B747-8',
          'B752': 'B757-200',
          'B753': 'B757-300',
          'B762': 'B767-200',
          'B763': 'B767-300',
          'B764': 'B767-400',
          'B772': 'B777-200',
          'B77L': 'B777-200LR',
          'B773': 'B777-300',
          'B77W': 'B777-300ER',
          'B778': 'B777-8',
          'B779': 'B777-9',
          'B788': 'B787-8',
          'B789': 'B787-9',
          'B78X': 'B787-10',
        
          // Embraer Commercial
          'E170': 'Embraer E170',
          'E175': 'Embraer E175',
          'E190': 'Embraer E190',
          'E195': 'Embraer E195',
          'E290': 'Embraer E190-E2',
          'E295': 'Embraer E195-E2',
        
          // Bombardier/Airbus (C Series)
          'BCS1': 'Airbus A220-100',
          'BCS3': 'Airbus A220-300',
          'CS100': 'Airbus A220-100',
          'CS300': 'Airbus A220-300',
        
          // ATR Aircraft
          'AT43': 'ATR 42-300',
          'AT45': 'ATR 42-500',
          'AT46': 'ATR 42-600',
          'AT72': 'ATR 72-200',
          'AT75': 'ATR 72-500',
          'AT76': 'ATR 72-600',
        
          // Bombardier Dash/Q Series
          'DH8A': 'Dash 8-100',
          'DH8B': 'Dash 8-200',
          'DH8C': 'Dash 8-300',
          'DH8D': 'Dash 8-400',
        
          // CRJ Series
          'CRJ1': 'Bombardier CRJ100',
          'CRJ2': 'Bombardier CRJ200',
          'CRJ7': 'Bombardier CRJ700',
          'CRJ9': 'Bombardier CRJ900',
          'CRJX': 'Bombardier CRJ1000',
        
          // McDonnell Douglas (Legacy)
          'MD11': 'McDonnell Douglas MD-11',
          'MD80': 'McDonnell Douglas MD-80',
          'MD82': 'McDonnell Douglas MD-82',
          'MD83': 'McDonnell Douglas MD-83',
          'MD87': 'McDonnell Douglas MD-87',
          'MD88': 'McDonnell Douglas MD-88',
          'MD90': 'McDonnell Douglas MD-90',
        
          // Fokker
          'F70': 'Fokker 70',
          'F100': 'Fokker 100',
        
          // British Aerospace
          'BA46': 'BAe 146',
          'RJ85': 'Avro RJ85',
          'RJ1H': 'Avro RJ100',
        
          // Antonov
          'A124': 'Antonov An-124',
          'A225': 'Antonov An-225',
        
          // Sukhoi
          'SU95': 'Sukhoi Superjet 100',
          
          // COMAC
          'C919': 'COMAC C919',
          'ARJ21': 'COMAC ARJ21'
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