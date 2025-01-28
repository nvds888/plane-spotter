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

  useEffect(() => {
    const fetchUserXP = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`);
        if (!response.ok) throw new Error('Failed to fetch XP');
        const data = await response.json();
        setUserXP(data);
      } catch (error) {
        console.error('Failed to fetch XP:', error);
      }
    };
    fetchUserXP();
  }, [session]);

  useEffect(() => {
    const fetchSpots = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(
          `https://plane-spotter-backend.onrender.com/api/spot?userId=${session.user.id}`
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

  const handleSpot = async () => {
    if (!coords || isLoading || !session?.user?.id) return;
    setIsLoading(true);
  
    try {
      const flightsResponse = await fetch(
        `https://plane-spotter-backend.onrender.com/api/flights/nearby?lat=${coords.latitude}&lon=${coords.longitude}`
      );
  
      if (!flightsResponse.ok) throw new Error('Failed to fetch flights');
      const flights: Flight[] = await flightsResponse.json();
  
      if (!flights.length) {
        alert('No flights detected within visible range!');
        return;
      }
  
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
  
        const spotResponse = await fetch('https://plane-spotter-backend.onrender.com/api/spot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
  
        if (!spotResponse.ok) {
          const errorResponse = await spotResponse.json();
          throw new Error(errorResponse.error || 'Failed to save spot');
        }
  
        const newSpot: Spot = await spotResponse.json();
        savedSpots.push(newSpot);
      }
  
      setSpots((prev) => [...prev, ...savedSpots]);
      alert(`Spotted ${savedSpots.length} flights!`);
  
      const xpResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`);
      const xpData = await xpResponse.json();
      setUserXP(xpData);
  
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

  const handleGuessSubmit = async () => {
    if (!currentGuessSpot) return;

    try {
      await fetch(`https://plane-spotter-backend.onrender.com/api/spot/${currentGuessSpot._id}/guess`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guessedType,
          guessedAltitudeRange: guessedAltRange
        })
      });

      const xpResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/xp`);
      const xpData = await xpResponse.json();
      setUserXP(xpData);

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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-800">✈️ Plane Spotter</h1>
          <p className="text-gray-600">Sign in to start your plane spotting journey</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signin" 
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup" 
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">✈️ Plane Spotter</h1>
          <div className="flex gap-3">
            <div className="bg-gray-100 px-3 py-1 rounded-lg text-sm">
              <span className="font-semibold">Weekly:</span> {userXP.weeklyXP}
            </div>
            <div className="bg-gray-100 px-3 py-1 rounded-lg text-sm">
              <span className="font-semibold">Total:</span> {userXP.totalXP}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {isClient && isGeolocationAvailable ? (
          <button
            onClick={handleSpot}
            disabled={isLoading}
            className={`w-48 h-48 rounded-full font-bold transition-all transform hover:scale-105 ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
            }`}
          >
            {isLoading ? 'Spotting...' : 'SPOT PLANE!'}
          </button>
        ) : (
          <div className="text-center p-6 bg-yellow-100 rounded-lg w-full max-w-md">
            {isClient ? 'Enable GPS to start spotting!' : 'Loading...'}
          </div>
        )}
        
        <div className="mt-8 text-center text-gray-600">
          You have spotted {spots.length} planes
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 bg-white shadow-lg">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link 
            href="/collections"
            className="px-4 py-2 text-blue-500 hover:text-blue-600 transition-colors"
          >
            My Collection
          </Link>
          <button 
            onClick={() => signOut()}
            className="px-4 py-2 text-red-500 hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </footer>

      {/* Guess Modal */}
      {showGuessModal && currentGuessSpot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">✈️ What Did You Spot?</h3>
            <p className="mb-4 text-sm text-gray-600">
              {newSpots.length} plane{newSpots.length > 1 ? 's' : ''} left to guess
            </p>

            <div className="mb-4">
              <Map
                center={coords ? [coords.latitude, coords.longitude] : [0, 0]}
                spots={newSpots}
                highlightedSpot={currentGuessSpot}
              />
            </div>

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
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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