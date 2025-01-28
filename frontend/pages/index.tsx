"use client";

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useGeolocated } from 'react-geolocated';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-dom-confetti';

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

const confettiConfig = {
  angle: 90,
  spread: 360,
  startVelocity: 40,
  elementCount: 70,
  dragFriction: 0.12,
  duration: 3000,
  stagger: 3,
  width: "10px",
  height: "10px",
  colors: ["#000000", "#ffffff"]
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [resultNotification, setResultNotification] = useState<{ correctType: boolean; correctAlt: boolean } | null>(null);

  const { coords, isGeolocationAvailable } = useGeolocated({
    positionOptions: { enableHighAccuracy: true },
    userDecisionTimeout: 5000,
  });

  const Map = dynamic(
    () => import("../components/Map"),
    { 
      ssr: false,
      loading: () => <div className="h-64 bg-gray-900 rounded-lg animate-pulse" />
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
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
  
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
      const response = await fetch(`https://plane-spotter-backend.onrender.com/api/spot/${currentGuessSpot._id}/guess`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guessedType,
          guessedAltitudeRange: guessedAltRange
        })
      });

      const result = await response.json();
      setResultNotification({
        correctType: result.isTypeCorrect,
        correctAlt: result.isAltitudeCorrect
      });

      const xpResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/xp`);
      const xpData = await xpResponse.json();
      setUserXP(xpData);

      setTimeout(() => {
        const nextSpots = newSpots.slice(1);
        if (nextSpots.length > 0) {
          setNewSpots(nextSpots);
          setCurrentGuessSpot(nextSpots[0]);
          setResultNotification(null);
        } else {
          setShowGuessModal(false);
          setNewSpots([]);
          setResultNotification(null);
        }
      }, 2000);

    } catch (error) {
      console.error('Guess submission failed:', error);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold"
          >
            ✈️ Plane Spotter
          </motion.h1>
          <p className="text-gray-400">Sign in to start your plane spotting journey</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signin" 
              className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors w-32">
              Sign In
            </Link>
            <Link href="/auth/signup" 
              className="px-6 py-3 border border-white text-white rounded-full font-medium hover:bg-gray-900 transition-colors w-32">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-800">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Plane Spotter</h1>
          <div className="flex gap-3">
            <div className="px-3 py-1 rounded-full text-sm border border-gray-800">
              Weekly: {userXP.weeklyXP}
            </div>
            <div className="px-3 py-1 rounded-full text-sm border border-gray-800">
              Total: {userXP.totalXP}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center max-w-2xl mx-auto w-full relative">
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Confetti active={showCelebration} config={confettiConfig} />
            </motion.div>
          )}
        </AnimatePresence>

        {isClient && isGeolocationAvailable ? (
          <motion.button
            onClick={handleSpot}
            disabled={isLoading}
            whileTap={{ scale: 0.95 }}
            className={`relative w-48 h-48 rounded-full font-bold border-2 border-white ${
              isLoading ? 'bg-gray-900' : 'hover:bg-gray-900'
            }`}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"
              />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl">✈️</div>
                <div>SPOT PLANE</div>
              </div>
            )}
          </motion.button>
        ) : (
          <div className="text-center p-6 bg-gray-900 rounded-lg w-full max-w-md">
            {isClient ? 'Enable GPS to start spotting!' : 'Loading...'}
          </div>
        )}
        
        <div className="mt-8 text-center text-gray-400">
          Spotted planes: {spots.length}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 w-full bg-black border-t border-gray-800">
        <div className="max-w-2xl mx-auto flex justify-between items-center p-4">
          <Link 
            href="/collections"
            className="px-4 py-2 hover:text-gray-300 transition-colors"
          >
            Collection
          </Link>
          <button 
            onClick={() => signOut()}
            className="px-4 py-2 hover:text-gray-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </footer>

      {/* Guess Modal */}
      {showGuessModal && currentGuessSpot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full border border-gray-800">
            <h3 className="text-xl font-bold mb-4">Identify Aircraft</h3>
            
            <div className="mb-4 text-sm text-gray-400">
              {newSpots.length} remaining
            </div>

            <div className="mb-4 h-64">
              <Map
                center={coords ? [coords.latitude, coords.longitude] : [0, 0]}
                spots={newSpots}
                highlightedSpot={currentGuessSpot}
              />
            </div>

            {resultNotification ? (
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${resultNotification.correctType ? 'bg-green-900' : 'bg-red-900'}`}>
                  Type: {resultNotification.correctType ? 'Correct' : 'Incorrect'}
                </div>
                <div className={`p-3 rounded-lg ${resultNotification.correctAlt ? 'bg-green-900' : 'bg-red-900'}`}>
                  Altitude: {resultNotification.correctAlt ? 'Correct' : 'Incorrect'}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <select
                    value={guessedType}
                    onChange={(e) => setGuessedType(e.target.value)}
                    className="w-full p-3 bg-black border border-gray-800 rounded-lg"
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
            <option value="B2">B-2 Spirit</option>
            <option value="Beluga">Airbus Beluga</option>
            <option value="Other">Other</option>
          </select>
                </div>

                <div className="space-y-2">
                  {['0-10,000 ft', '10,000-30,000 ft', '30,000+ ft'].map((range) => (
                    <label key={range} className="flex items-center gap-2 p-2 border border-gray-800 rounded-lg">
                      <input
                        type="radio"
                        name="altRange"
                        value={range}
                        checked={guessedAltRange === range}
                        onChange={(e) => setGuessedAltRange(e.target.value)}
                        className="accent-white"
                      />
                      {range}
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleGuessSubmit}
                  className="w-full py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}