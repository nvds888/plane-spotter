"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useGeolocated } from "react-geolocated"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, House, BookOpen, Users, MapPin, Plane, Sparkles } from "lucide-react"
import ProfileModal from "../components/ProfileModal"
import TeleportModal from "../components/TeleportModal"
import LocationStatsModal from "../components/LocationStatsModal"
import ResultsModal from "../components/ResultsModal"
import GuessModal from "../components/GuessModal"
import Image from 'next/image'


export type Flight = {
  hex: string
  flight: string
  type: string
  alt: number
  speed: number
  operator: string
  operating_as: string  
  painted_as: string
  lat: number
  lon: number
  departureAirport: string  
  arrivalAirport: string  
  dest_iata: string    
  orig_iata: string  
  track?: number
  geography?: {
    direction?: number
    altitude?: number
    latitude?: number
    longitude?: number
    gspeed?: number
  }
}

type GlobalSpot = {
  flight: {
    type: string;
  };
  city: string;
  country: string;
}

export type Spot = {
  _id: string
  userId: string
  lat: number
  lon: number
  timestamp: string
  flight: Flight
  guessedType?: string
  guessedAirline?: string
  guessedDestination?: string
  isTypeCorrect?: boolean
  isAirlineCorrect?: boolean
  isDestinationCorrect?: boolean
  bonusXP?: number
  baseXP?: number
}

type GuessResult = {
  spot: Spot
  isTypeCorrect: boolean
  isAirlineCorrect: boolean
  isDestinationCorrect: boolean
  xpEarned: number
}

export default function Home() {
  const { data: session } = useSession()
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newSpots, setNewSpots] = useState<Spot[]>([])
  const [showGuessModal, setShowGuessModal] = useState(false)
  const [guessCount, setGuessCount] = useState<number>(0)
  const [userXP, setUserXP] = useState<{ totalXP: number; weeklyXP: number }>({ totalXP: 0, weeklyXP: 0 })
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [guessResults, setGuessResults] = useState<GuessResult[]>([])
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [globalSpot, setGlobalSpot] = useState<GlobalSpot | null>(null)
  const [showLocationStatsModal, setShowLocationStatsModal] = useState(false)
  const [spotsRemaining, setSpotsRemaining] = useState<number>(0)
  const [spotLimit, setSpotLimit] = useState<number>(4)
  const [showTeleportModal, setShowTeleportModal] = useState(false)
  const [isTeleportSpot, setIsTeleportSpot] = useState(false)
  const [teleportCoords, setTeleportCoords] = useState<{latitude: number; longitude: number} | null>(null)
  const [guessedSpotIds, setGuessedSpotIds] = useState<string[]>([])

  const { coords, isGeolocationAvailable } = useGeolocated({
    positionOptions: { enableHighAccuracy: true },
    userDecisionTimeout: 5000,
  })

  useEffect(() => setIsClient(true), [])

  useEffect(() => {
    const fetchUserXP = async () => {
      if (!session?.user?.id) return
      try {
        // Fetch both XP and user data
        const [xpResponse, userResponse] = await Promise.all([
          fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`),
          fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}`)
        ]);
  
        if (!xpResponse.ok) throw new Error("Failed to fetch XP")
        if (!userResponse.ok) throw new Error("Failed to fetch user data")
  
        const xpData = await xpResponse.json()
        const userData = await userResponse.json()
        setUserXP(xpData)
        setSpotsRemaining(userData.spotsRemaining)
        setSpotLimit(userData.dailySpotLimit)
      } catch (error) {
        console.error("Failed to fetch user data:", error)
      }
    }
    fetchUserXP()
  }, [session])

  useEffect(() => {
    if (!session?.user?.id) return;

    const subscribeToGlobalSpots = () => {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('https://plane-spotter-backend.onrender.com/api/user/spots/latest');
          const spot = await response.json();
          
          if (spot) {
            setGlobalSpot(spot);
            setTimeout(() => setGlobalSpot(null), 3000);
          }
        } catch (error) {
          console.error("Failed to fetch global spot:", error);
        }
      }, 8000);
  
      return () => clearInterval(interval);
    };
  
    const cleanup = subscribeToGlobalSpots();
    return () => cleanup();
  }, [session]);

  const handleSpot = async () => {
    setGuessResults([])
    setIsTeleportSpot(false)
    setTeleportCoords(null)
    if (!coords || isLoading || !session?.user?.id) return
    if (spotsRemaining <= 0) {
      alert("You've reached your daily spot limit! Upgrade to premium for unlimited spots.")
      return
    }
    setIsLoading(true)
  
    try {
      // Encode userId to make it URL safe
      const userId = encodeURIComponent(session.user.id)
      const flightsResponse = await fetch(
        `https://plane-spotter-backend.onrender.com/api/flights/nearby?lat=${coords.latitude}&lon=${coords.longitude}&userId=${userId}`
      )
  
      if (!flightsResponse.ok) throw new Error("Failed to fetch flights")
      const flights = await flightsResponse.json()
  
      if (!flights.length) {
        alert("No flights detected within visible range!")
        setIsLoading(false)
        return
      }
  
      const savedSpots: Spot[] = []
      let isFirstSpot = true  // Add this line
      
      for (const flight of flights) {
        const requestBody = {
          userId: session.user.id,
          lat: coords.latitude,
          lon: coords.longitude,
          flight,
          isFirstSpot,
          isTeleport: false    
        }
      
        const spotResponse = await fetch("https://plane-spotter-backend.onrender.com/api/spot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })
      
        isFirstSpot = false 
  
        if (!spotResponse.ok) {
          const errorData = await spotResponse.json();
          if (errorData.error === 'Daily spot limit reached') {
            alert(`You've reached your daily spot limit! Next reset at ${new Date(errorData.nextResetTime).toLocaleString()}`);
            return;
          }
          throw new Error(errorData.error || "Failed to save spot");
        }
  
        const newSpot: Spot = await spotResponse.json()
        savedSpots.push(newSpot)
      }
  
      alert(`Spotted ${savedSpots.length} flights!`)
  
      const xpResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`)
      const xpData = await xpResponse.json()
      setUserXP(xpData)

      const userResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}`);
      const userData = await userResponse.json();
      setSpotsRemaining(userData.spotsRemaining);
  
      if (savedSpots.length > 0) {
        setNewSpots(savedSpots);
        setGuessCount(0);
        setGuessedSpotIds([]);
        setShowGuessModal(true);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      alert(`Spotting failed: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuessSubmit = async (
    spot: Spot, 
    guessedType: string, 
    guessedAirline: string, 
    guessedDestination: string
  ) => {
    if (!session?.user?.id) return;
  
    try {
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/spot/${spot._id}/guess`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guessedType,
            guessedAirline,
            guessedDestination
          }),
        }
      );
  
      const result = await response.json();
      const newGuessedSpotIds = [...guessedSpotIds, spot._id];
      const newGuessCount = guessCount + 1;
      
      // Update all related state
      setGuessedSpotIds(newGuessedSpotIds);
      setGuessCount(newGuessCount);
      setGuessResults(prev => [...prev, {
        spot: spot,
        isTypeCorrect: result.isTypeCorrect,
        isAirlineCorrect: result.isAirlineCorrect,
        isDestinationCorrect: result.isDestinationCorrect,
        xpEarned: result.bonusXP + (spot.baseXP || 5),
      }]);
  
      // Update XP
      const xpResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`);
      const xpData = await xpResponse.json();
      setUserXP(xpData);
  
      // Determine when to show results
      if (newSpots.length > 3) {
        // If more than 3 spots, always require exactly 3 guesses
        if (newGuessCount >= 3) {
          setShowGuessModal(false);
          setShowResultsModal(true);
        }
      } else {
        // If 3 or fewer spots, require guessing all spots
        if (newGuessedSpotIds.length === newSpots.length) {
          setShowGuessModal(false);
          setShowResultsModal(true);
        }
      }
    } catch (error) {
      console.error("Guess submission failed:", error);
    }
  };
  
  if (!session) {
    return (
      <div className="h-screen w-full bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="text-indigo-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Planeify</h1>
              <p className="text-gray-500 mb-6">Join the community of aviation enthusiasts</p>
              <div className="space-y-3">
                <Link
                  href="/auth/signin"
                  className="block w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="block w-full py-3 px-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-medium"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Premium Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 pt-8 pb-6 px-4 fixed top-0 left-0 right-0 z-10 rounded-xl mx-1">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 px-3 rounded-lg backdrop-blur-md h-7 flex items-center">
              <Image
                src="/pwa-nobackground.png"
                alt="Planeify"
                width={80}
                height={20}
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowTeleportModal(true)}
                className="bg-white/10 px-4 py-1 rounded-full backdrop-blur-md flex items-center gap-2"
              >
                <Sparkles className="text-white" size={16} />
                <span className="text-white text-sm font-medium">Teleport</span>
              </button>
              <button 
                onClick={() => setShowProfileModal(true)}
                className="bg-white/10 px-4 py-1 rounded-full backdrop-blur-md"
              >
                <span className="text-white text-sm font-medium">@{session.user.username}</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* XP Display */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              <span className="text-white/90 text-sm">Weekly XP</span>
            </div>
            <span className="text-2xl font-bold text-white">{userXP.weeklyXP}</span>
          </div>
          <div className="flex-1 bg-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              <span className="text-white/90 text-sm">Total XP</span>
            </div>
            <span className="text-2xl font-bold text-white">{userXP.totalXP}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 mt-[180px] mb-24 overflow-y-auto">
        
        {/* Spot Button */}
        {isClient && isGeolocationAvailable ? (
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <motion.button
              onClick={handleSpot}
              disabled={isLoading}
              className="relative p-1 rounded-full transform transition-all active:scale-95 hover:scale-105"
              whileTap={{ scale: 0.95 }}
            >
              <div className="bg-white rounded-full p-1">
                <div className="w-40 h-40 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center group">
                  <MapPin className="w-16 h-16 text-white group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </motion.button>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 text-center">
            <MapPin className="text-indigo-600 mx-auto mb-3" size={24} />
            <p className="text-gray-600">
              {isClient ? "Enable GPS to start spotting!" : "Loading..."}
            </p>
          </div>
        )}

        {/* Spots Remaining Counter */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500">Available Spots</span>
          <div className="text-2xl font-bold text-indigo-600">
            {spotsRemaining}/{spotLimit}
          </div>
        </div>

        {/* analyze area */}
        {isClient && isGeolocationAvailable && (
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-20">
            <motion.button
              onClick={() => setShowLocationStatsModal(true)}
              className="bg-white shadow-lg rounded-l-xl p-3 hover:bg-gray-50 transition-colors group relative"
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute right-full top-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity mr-2 whitespace-nowrap">
                <span className="text-xs text-gray-600">Analyze Area</span>
              </div>
              <MapPin className="w-5 h-5 text-indigo-600" />
            </motion.button>
          </div>
        )}
      </main>       

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-around py-4">
            <Link href="/" className="flex flex-col items-center gap-1 text-indigo-600">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <House size="24" /> 
              </div>
              <span className="text-xs font-medium">Home</span>
            </Link>
            
            <Link href="/community" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs">Community</span>
            </Link>
            
            <Link href="/collections" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xs">Collection</span>
            </Link>
            
            <Link href="/achievements" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-xs">Achievements</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Global Spot Alert */}
      <AnimatePresence>
        {globalSpot && (
          <motion.div
            className="fixed top-4 right-4 left-4 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2">
                <Plane className="text-indigo-600" size={16} />
                <span className="text-sm">
                  {globalSpot.flight?.type} spotted in {globalSpot.city}, {globalSpot.country}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guess Modal */}
      <GuessModal
        isOpen={showGuessModal}
        onClose={() => setShowGuessModal(false)}
        spots={newSpots}
        coordinates={coords ? { latitude: coords.latitude, longitude: coords.longitude } : null}
        isTeleport={isTeleportSpot}
        teleportCoords={teleportCoords}
        onGuessSubmit={handleGuessSubmit}
        guessedSpotIds={guessedSpotIds}
        guessCount={guessCount}
        userId={session?.user?.id || ''}
      />

      <ResultsModal 
        isOpen={showResultsModal}
        onClose={() => {
          setShowResultsModal(false);
          setGuessResults([]);
        }}
        guessResults={guessResults}
        allSpots={newSpots}
        totalSpots={newSpots.length}
      />

      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userId={session.user.id}
      />

      <LocationStatsModal 
        isOpen={showLocationStatsModal}
        onClose={() => setShowLocationStatsModal(false)}
        currentLocation={coords ? {
          latitude: coords.latitude,
          longitude: coords.longitude
        } : null}
      />

      <TeleportModal 
        isOpen={showTeleportModal}
        onClose={() => setShowTeleportModal(false)}
        onSpot={async (coords) => {
          setIsTeleportSpot(true)           
          setTeleportCoords(coords)   
          if (isLoading || !session?.user?.id) return;
          if (spotsRemaining <= 0) {
            alert("You've reached your daily spot limit! Upgrade to premium for unlimited spots.")
            return;
          }
          
          setIsLoading(true);
          try {
            const userId = encodeURIComponent(session.user.id);
            const flightsResponse = await fetch(
              `https://plane-spotter-backend.onrender.com/api/flights/nearby?lat=${coords.latitude}&lon=${coords.longitude}&userId=${userId}`
            );

            if (!flightsResponse.ok) throw new Error("Failed to fetch flights");
            const flights = await flightsResponse.json();

            if (!flights.length) {
              alert("No flights detected within visible range!");
              return;
            }

            const savedSpots: Spot[] = [];
            let isFirstSpot = true;
            
            for (const flight of flights) {
              const requestBody = {
                userId: session.user.id,
                lat: coords.latitude,
                lon: coords.longitude,
                flight,
                isFirstSpot,
                isTeleport: true,    
                location: {
                  name: coords.locationName,
                  description: coords.locationDescription
                }
              };
            
              const spotResponse = await fetch("https://plane-spotter-backend.onrender.com/api/spot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
              });
            
              isFirstSpot = false;

              if (!spotResponse.ok) {
                const errorResponse = await spotResponse.json();
                throw new Error(errorResponse.error || "Failed to save spot");
              }

              const newSpot: Spot = await spotResponse.json();
              savedSpots.push(newSpot);
            }

            alert(`Spotted ${savedSpots.length} flights!`);

            const xpResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`);
            const xpData = await xpResponse.json();
            setUserXP(xpData);

            const userResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}`);
            const userData = await userResponse.json();
            setSpotsRemaining(userData.spotsRemaining);

            if (savedSpots.length > 0) {
              setNewSpots(savedSpots);
              setGuessCount(0);
              setGuessedSpotIds([]);
              setShowGuessModal(true);
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            alert(`Spotting failed: ${message}`);
          } finally {
            setIsLoading(false);
          }
        }}
      />
    </div>
  )
}
