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
          distance: '50' // 50km radius
        }
      }
    );

    console.log('API Response:', response.data);

    const flights = response.data.map(flight => ({
      aircraftIcao24: flight.aircraft?.icao24 || 'N/A',
      aircraftIcaoCode: flight.aircraft?.icaoCode || 'N/A',
      aircraftRegNumber: flight.aircraft?.regNumber || 'N/A',
      airlineIcaoCode: flight.airline?.icaoCode || 'Unknown',
      flightNumber: flight.flight?.number || 'N/A',
      flightIcaoNumber: flight.flight?.icaoNumber || 'N/A',
      latitude: flight.geography?.latitude || 0,
      longitude: flight.geography?.longitude || 0,
      altitude: flight.geography?.altitude || 0,
      direction: flight.geography?.direction || 0,
      horizontalSpeed: flight.speed?.horizontal || 0,
      isGround: flight.speed?.isGround || false,
      verticalSpeed: flight.speed?.vspeed || 0,
      squawk: flight.system?.squawk || 'N/A',
      status: flight.status || 'unknown',
      lastUpdate: new Date(flight.system?.updated || Date.now())
    }));

    const visibleFlights = flights.filter(flight => {
      const distance = calculateDistance(lat, lon, flight.latitude, flight.longitude);
      console.log(
        'Flight:', flight.flightIcaoNumber,
        'Distance:', distance,
        'Altitude:', flight.altitude
      );
      return (flight.altitude === 0 || flight.altitude < 40000) && distance <= 50;
    });

    console.log('Visible Flights:', visibleFlights);

    res.status(200).json(visibleFlights);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

module.exports = router;