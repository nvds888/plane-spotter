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

router.get('/nearby', async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await axios.get(
      'https://aviation-edge.com/v2/public/flights',
      {
        params: {
          key: process.env.AVIATION_EDGE_API_KEY,
          lat,
          lng: lon,
          distance: '25'
        }
      }
    );

    // Filter flights based on distance and altitude
    const visibleFlights = response.data.filter(flight => {
      const distance = calculateDistance(
        lat, 
        lon, 
        flight.geography.latitude, 
        flight.geography.longitude
      );
      const hasValidAltitude = flight.geography.altitude && flight.geography.altitude >= 500;
      // Check if within 25km radius
      const isWithinRange = distance <= 25;
      
      return hasValidAltitude && isWithinRange;
    });

    res.status(200).json(visibleFlights);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

router.get('/suggestions', async (req, res) => {
  const { lat, lon } = req.query;
  console.log('Suggestions API called with:', { lat, lon });

  try {
    const response = await axios.get(
      'https://aviation-edge.com/v2/public/flights',
      {
        params: {
          key: process.env.AVIATION_EDGE_API_KEY,
          lat,
          lng: lon,
          distance: '100'
        }
      }
    );

    console.log('Raw flights data:', response.data.length, 'flights found');

    const flights = response.data;
    
    // Extract unique airlines and destinations
    const airlines = new Map();
    const destinations = new Map();
    
    flights.forEach(flight => {
      console.log('Processing flight:', {
        airline: flight.airline?.iataCode,
        destination: flight.arrival?.iataCode
      });

      if (flight.airline?.iataCode) {
        airlines.set(flight.airline.iataCode, {
          code: flight.airline.iataCode,
          name: flight.airline.name || flight.airline.icaoCode || flight.airline.iataCode
        });
      }
      
      if (flight.arrival?.iataCode) {
        destinations.set(flight.arrival.iataCode, {
          code: flight.arrival.iataCode,
          name: flight.arrival.iataCode
        });
      }
    });

    const result = {
      airlines: Array.from(airlines.values()),
      destinations: Array.from(destinations.values())
    };

    console.log('Sending suggestions:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flight suggestions' });
  }
});

module.exports = router;