import axios from 'axios';

interface Flight {
  airline?: {
    iataCode: string
    icaoCode: string
    name?: string
  }
  arrival?: {
    iataCode: string
    icaoCode: string
    airport?: string
  }
  aircraft?: {
    iataCode: string
  }
}

export async function getNearbyFlightSuggestions(lat: number, lon: number) {
  try {
    const response = await axios.get('/api/flights/nearby', {
      params: { lat, lon }
    });
    const flights: Flight[] = response.data;

    // Get unique airlines and destinations
    const airlines = new Map();
    const destinations = new Map();
    
    flights.forEach(flight => {
      if (flight.airline?.iataCode) {
        airlines.set(flight.airline.iataCode, {
          code: flight.airline.iataCode,
          name: flight.airline.name || flight.airline.iataCode
        });
      }
      
      if (flight.arrival?.iataCode) {
        destinations.set(flight.arrival.iataCode, {
          code: flight.arrival.iataCode,
          name: flight.arrival.airport || flight.arrival.iataCode
        });
      }
    });

    return {
      airlines: Array.from(airlines.values()),
      destinations: Array.from(destinations.values())
    };
  } catch (error) {
    console.error('Failed to fetch flight suggestions:', error);
    return {
      airlines: [],
      destinations: []
    };
  }
}