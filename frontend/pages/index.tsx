"use client";

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useGeolocated } from 'react-geolocated';
import Link from 'next/link';
import dynamic from 'next/dynamic';

type Flight = {
  hex: string;
  flight: string;
  type: string;
  alt: number;
  speed: number;
  operator: string;
  lat: number;
  lon: number;
};

type Spot = {
  _id: string;
  userId: string;
  lat: number;
  lon: number;
  timestamp: string;
  flight?: Flight;
};

export default function Home() {
  const { data: session } = useSession();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newSpots, setNewSpots] = useState<Spot[]>([]);
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [currentGuessSpot, setCurrentGuessSpot] = useState<Spot | null>(null);
  const [guessedType, setGuessedType] = useState('');
  const [guessedAltRange, setGuessedAltRange] = useState('');
  const [userXP, setUserXP] = useState<{ totalXP: number; weeklyXP: number }>({ totalXP: 0, weeklyXP: 0 });

  const { coords, isGeolocationAvailable } = useGeolocated({
    positionOptions: { enableHighAccuracy: true },
    userDecisionTimeout: 5000,
  });

  const Map = dynamic(
    () => import("../components/Map"),
    { 
      ssr: false,
      loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
    }
  );

  useEffect(() => setIsClient(true), []);

  // Fetch user's XP balance
  useEffect(() => {
    const fetchUserXP = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(`http://localhost:5000/api/user/${session.user.id}/xp`);
        if (!response.ok) throw new Error('Failed to fetch XP');
        const data = await response.json();
        setUserXP(data);
      } catch (error) {
        console.error('Failed to fetch XP:', error);
      }
    };
    fetchUserXP();
  }, [session]);

  // Fetch user's spots
  useEffect(() => {
    const fetchSpots = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(
          `http://localhost:5000/api/spot?userId=${session.user.id}`
        );
        if (!response.ok) throw new Error('Failed to fetch spots');
        const data: Spot[] = await response.json();
        setSpots(data);
      } catch (error) {
        console.error('Failed to fetch spots:', error);
      }
    };
    fetchSpots();
  }, [session]);

  // Handle spotting planes
  const handleSpot = async () => {
    if (!coords || isLoading || !session?.user?.id) return;
    setIsLoading(true);
  
    console.log('User Coordinates:', coords.latitude, coords.longitude); // Log coordinates
  
    try {
      const flightsResponse = await fetch(
        `http://localhost:5000/api/flights/nearby?lat=${coords.latitude}&lon=${coords.longitude}`
      );
  
      if (!flightsResponse.ok) throw new Error('Failed to fetch flights');
      const flights: Flight[] = await flightsResponse.json();
  
      console.log('Fetched Flights:', flights); // Log fetched flights
  
      if (!flights.length) {
        alert('No flights detected within visible range!');
        return;
      }
  
      // Save all visible flights
      const savedSpots: Spot[] = [];
      for (const flight of flights) {
        const requestBody = {
          userId: session.user.id,
          lat: coords.latitude,
          lon: coords.longitude,
          flight: {
            hex: flight.hex,
            flight: flight.flight,
            type: flight.type,
            alt: flight.alt,
            speed: flight.speed,
            operator: flight.operator,
            lat: flight.lat,
            lon: flight.lon,
          },
        };
  
        console.log('Request Body:', JSON.stringify(requestBody, null, 2)); // Log the request body
  
        // Save spot with flight data
        const spotResponse = await fetch('http://localhost:5000/api/spot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
  
        if (!spotResponse.ok) {
          const errorResponse = await spotResponse.json(); // Parse the error response
          console.error('Backend Error:', errorResponse);
          throw new Error(errorResponse.error || 'Failed to save spot');
        }
  
        const newSpot: Spot = await spotResponse.json();
        savedSpots.push(newSpot);
      }
  
      // Update the spots state with all newly saved spots
      setSpots((prev) => [...prev, ...savedSpots]);
      alert(`Spotted ${savedSpots.length} flights!`);
  
      // Refresh XP
      const xpResponse = await fetch(`http://localhost:5000/api/user/${session.user.id}/xp`);
      const xpData = await xpResponse.json();
      setUserXP(xpData);
  
      // Show guess modal for new spots
      if (savedSpots.length > 0) {
        setNewSpots(savedSpots);
        setCurrentGuessSpot(savedSpots[0]);
        setShowGuessModal(true);
      }
  
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Spotting failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle guess submission
  const handleGuessSubmit = async () => {
    if (!currentGuessSpot) return;

    try {
      await fetch(`http://localhost:5000/api/spot/${currentGuessSpot._id}/guess`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guessedType,
          guessedAltitudeRange: guessedAltRange
        })
      });

      // Refresh XP
      const xpResponse = await fetch(`http://localhost:5000/api/user/${session?.user?.id}/xp`);
      const xpData = await xpResponse.json();
      setUserXP(xpData);

      // Move to next spot
      const nextSpots = newSpots.slice(1);
      if (nextSpots.length > 0) {
        setNewSpots(nextSpots);
        setCurrentGuessSpot(nextSpots[0]);
      } else {
        setShowGuessModal(false);
        setNewSpots([]);
      }
    } catch (error) {
      console.error('Guess submission failed:', error);
    }
  };

  if (!session) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <p className="mb-4">Please sign in to access Plane Spotter</p>
        <div className="flex gap-4 justify-center">
        <Link href="/auth/signin" className="btn-primary">Sign In</Link>
        <Link href="/auth/signup" className="btn-secondary">Sign Up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">✈️ Plane Spotter</h1>
        <div className="flex gap-2 items-center">
          <div className="bg-gray-100 px-3 py-1 rounded-lg text-sm">
            <span className="font-semibold">Weekly:</span> {userXP.weeklyXP}
          </div>
          <div className="bg-gray-100 px-3 py-1 rounded-lg text-sm">
            <span className="font-semibold">Total:</span> {userXP.totalXP}
          </div>
          <Link 
            href="/collections"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            My Collection
          </Link>
          <button 
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="mb-6">
        {isClient && isGeolocationAvailable ? (
          <button
            onClick={handleSpot}
            disabled={isLoading}
            className={`w-full p-4 rounded-lg font-bold transition-colors ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Spotting...' : 'SPOT PLANE!'}
          </button>
        ) : (
          <div className="text-center p-4 bg-yellow-100 rounded-lg">
            {isClient ? 'Enable GPS to start spotting!' : 'Loading...'}
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link 
          href="/collections"
          className="inline-block px-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          View Your Collection ({spots.length})
        </Link>
      </div>

      {showGuessModal && currentGuessSpot && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      <h3 className="text-xl font-bold mb-4">✈️ What Did You Spot?</h3>
      <p className="mb-4 text-sm text-gray-600">
        {newSpots.length} plane{newSpots.length > 1 ? 's' : ''} left to guess
      </p>

      {/* Map Section */}
      <div className="mb-4">
        <Map
          center={coords ? [coords.latitude, coords.longitude] : [0, 0]}
          spots={newSpots}
          highlightedSpot={currentGuessSpot}
        />
      </div>

      {/* Guess Form */}
      <div className="space-y-4">
        <div>
          <label className="block mb-2">Aircraft Type</label>
          <select
            value={guessedType}
            onChange={(e) => setGuessedType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Type</option>
            <option value="A320">Airbus A320</option>
            <option value="A20N">Airbus A320neo</option>
            <option value="A321">Airbus A321</option>
            <option value="A21N">Airbus A321neo</option>
            <option value="A330">Airbus A330</option>
            <option value="A350">Airbus A350</option>
            <option value="A380">Airbus A380</option>
            <option value="737">Boeing 737</option>
            <option value="737M">Boeing 737 MAX</option>
            <option value="747">Boeing 747</option>
            <option value="757">Boeing 757</option>
            <option value="767">Boeing 767</option>
            <option value="777">Boeing 777</option>
            <option value="787">Boeing 787</option>
            <option value="C130">Lockheed C-130 Hercules</option>
            <option value="F16">F-16 Fighting Falcon</option>
            <option value="B2">B-2 Spirit</option>
            <option value="Beluga">Airbus Beluga</option>
            <option value="Concorde">Concorde</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">Altitude Range</label>
          <div className="space-y-2">
            {['0-10,000 ft', '10,000-30,000 ft', '30,000+ ft'].map((range) => (
              <label key={range} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="altRange"
                  value={range}
                  checked={guessedAltRange === range}
                  onChange={(e) => setGuessedAltRange(e.target.value)}
                />
                {range}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleGuessSubmit}
          className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Submit Guess
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}