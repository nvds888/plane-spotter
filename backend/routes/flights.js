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
      const isWithinRange = distance <= 50;
      
      return hasValidAltitude && isWithinRange;
    });

    res.status(200).json(visibleFlights);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

module.exports = router;