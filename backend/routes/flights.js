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
          distance: '50'
        }
      }
    );

    // Map the new API response to match the existing frontend Flight type
    const flights = response.data.map(flight => ({
      hex: flight.aircraft?.icao24 || 'N/A',  // map to existing hex field
      flight: flight.flight?.number || 'N/A',  // map flight number
      type: flight.aircraft?.icaoCode || 'N/A', // map aircraft type
      alt: flight.geography?.altitude || 0,     // map altitude
      speed: flight.speed?.horizontal || 0,     // map ground speed
      operator: flight.airline?.icaoCode || 'Unknown', // map operator
      lat: flight.geography?.latitude || 0,     // map latitude
      lon: flight.geography?.longitude || 0     // map longitude
    }));

    const visibleFlights = flights.filter(flight => {
      const distance = calculateDistance(lat, lon, flight.lat, flight.lon);
      return (flight.alt === 0 || flight.alt < 40000) && distance <= 50;
    });

    res.status(200).json(visibleFlights);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

module.exports = router;