const express = require('express');
const router = express.Router();
const axios = require('axios');


// Helper: Calculate distance between two GPS points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// GET /api/flights/nearby
router.get('/nearby', async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await axios.get(
      `https://adsbexchange-com1.p.rapidapi.com/v2/lat/${lat}/lon/${lon}/dist/50/`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com'
        }
      }
    );

    console.log('API Response:', response.data); // Log the raw API response

    const flights = response.data.ac.map(flight => ({
      hex: flight.hex,
      flight: flight.flight ? flight.flight.trim() : 'N/A',
      type: flight.t || flight.type || 'N/A',
      alt: flight.alt_baro || 0, // Default to 0 if alt_baro is missing
      speed: flight.gs || 0,
      operator: flight.operator || 'Unknown',
      lat: flight.lat,
      lon: flight.lon
    }));

    const visibleFlights = flights.filter(flight => {
      const distance = calculateDistance(lat, lon, flight.lat, flight.lon);
      console.log('Flight:', flight.hex, 'Distance:', distance, 'Altitude:', flight.alt); // Log flight details
      return (flight.alt === 0 || flight.alt < 40000) && distance <= 50;
    });

    console.log('Visible Flights:', visibleFlights); // Log the filtered flights

    res.status(200).json(visibleFlights);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

module.exports = router;