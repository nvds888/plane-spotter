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
    console.log('Fetching flights for coordinates:', { lat, lon });
    
    const response = await axios.get(
      'https://aviation-edge.com/v2/public/flights',
      {
        params: {
          key: process.env.AVIATION_EDGE_API_KEY,
          lat,
          lng: lon,
          distance: '50'
        }
      }
    );

    console.log('Raw API Response:', JSON.stringify(response.data, null, 2));

    // Map the new API response to match the existing frontend Flight type
    const flights = response.data.map(flight => {
      const mappedFlight = {
        hex: flight.aircraft?.icao24 || 'N/A',
        flight: flight.flight?.number || 'N/A',
        type: flight.aircraft?.icaoCode || 'N/A',
        alt: flight.geography?.altitude || 0,
        speed: flight.speed?.horizontal || 0,
        operator: flight.airline?.icaoCode || 'Unknown',
        lat: flight.geography?.latitude || 0,
        lon: flight.geography?.longitude || 0
      };
      
      console.log('Mapped flight:', mappedFlight);
      return mappedFlight;
    });

    const visibleFlights = flights.filter(flight => {
      const distance = calculateDistance(lat, lon, flight.lat, flight.lon);
      console.log('Flight distance check:', {
        flight: flight.flight,
        distance,
        altitude: flight.alt,
        included: (flight.alt === 0 || flight.alt < 40000) && distance <= 50
      });
      return (flight.alt === 0 || flight.alt < 40000) && distance <= 50;
    });

    console.log('Filtered visible flights:', visibleFlights);

    res.status(200).json(visibleFlights);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

module.exports = router;