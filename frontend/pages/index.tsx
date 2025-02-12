"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useGeolocated } from "react-geolocated"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, House, BookOpen, Users, MapPin, Plane } from "lucide-react"
import ProfileModal from "../components/ProfileModal"
import LocationStatsModal from "../components/LocationStatsModal"


interface AircraftTypeOption {
  code: string;
  name: string;
}

interface AirlineOption {
  code: string;
  name: string;
}

interface DestinationOption {
  code: string;
  name: string;
}

type Flight = {
  hex: string
  flight: string
  type: string
  alt: number
  speed: number
  operator: string
  lat: number
  lon: number
  departureAirport: string  // Changed from departureairport
  arrivalAirport: string    // Changed from arrivalairport
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



type Spot = {
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
  const [currentGuessSpot, setCurrentGuessSpot] = useState<Spot | null>(null)
  const [guessedType, setGuessedType] = useState("")
  const [userXP, setUserXP] = useState<{ totalXP: number; weeklyXP: number }>({ totalXP: 0, weeklyXP: 0 })
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [guessResults, setGuessResults] = useState<GuessResult[]>([])
  const [guessedAirline, setGuessedAirline] = useState("")
const [guessedDestination, setGuessedDestination] = useState("")
const [aircraftTypeOptions, setAircraftTypeOptions] = useState<AircraftTypeOption[]>([]);
const [airlineOptions, setAirlineOptions] = useState<AirlineOption[]>([]);
const [destinationOptions, setDestinationOptions] = useState<DestinationOption[]>([]);
const [showProfileModal, setShowProfileModal] = useState(false)
const [globalSpot, setGlobalSpot] = useState<GlobalSpot | null>(null);
const [showLocationStatsModal, setShowLocationStatsModal] = useState(false)
const [spotsRemaining, setSpotsRemaining] = useState<number>(0)
  const [spotLimit, setSpotLimit] = useState<number>(4)


  const { coords, isGeolocationAvailable } = useGeolocated({
    positionOptions: { enableHighAccuracy: true },
    userDecisionTimeout: 5000,
  })

  const Map = dynamic(() => import("../components/Map"), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />,
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
      for (const flight of flights) {
        const requestBody = {
          userId: session.user.id,
          lat: coords.latitude,
          lon: coords.longitude,
          flight
        }
  
        const spotResponse = await fetch("https://plane-spotter-backend.onrender.com/api/spot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })
  
        if (!spotResponse.ok) {
          const errorResponse = await spotResponse.json()
          throw new Error(errorResponse.error || "Failed to save spot")
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
        setNewSpots(savedSpots)
        setCurrentGuessSpot(savedSpots[0])
        await fetchSuggestions()
        setShowGuessModal(true)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      alert(`Spotting failed: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchSuggestions = async () => {
    if (!coords || !session) return;
    if (!session.user?.id) return;
    
    try {
      const userId = encodeURIComponent(session.user.id);
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/flights/suggestions?lat=${coords.latitude}&lon=${coords.longitude}&userId=${userId}`
      );
      
      const data = await response.json();
      setAirlineOptions(data.airlines);
      setDestinationOptions(data.destinations);
      setAircraftTypeOptions(data.aircraftTypes);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  };

  const handleGuessSubmit = async () => {
    if (!currentGuessSpot || !session?.user?.id) return
  
    try {
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/spot/${currentGuessSpot._id}/guess`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guessedType,
            guessedAirline,
            guessedDestination
          }),
        },
      )
  
      const result = await response.json()
  
      setGuessResults((prev) => [
        ...prev,
        {
          spot: currentGuessSpot,
          isTypeCorrect: result.isTypeCorrect,
          isAirlineCorrect: result.isAirlineCorrect,
          isDestinationCorrect: result.isDestinationCorrect,
          xpEarned: result.bonusXP + 5, // Base XP (5) + Bonus XP
        },
      ])
  
      // Reset guess fields
      setGuessedType("")
      setGuessedAirline("")
      setGuessedDestination("")
  
      const xpResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`)
      const xpData = await xpResponse.json()
      setUserXP(xpData)
  
      const nextSpots = newSpots.slice(1)
      if (nextSpots.length > 0) {
        setNewSpots(nextSpots)
        setCurrentGuessSpot(nextSpots[0])
      } else {
        setShowGuessModal(false)
        setShowResultsModal(true)
        setNewSpots([])
      }
    } catch (error) {
      console.error("Guess submission failed:", error)
    }
  }

  if (!session) {
    return (
      <div className="h-screen w-full bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="text-indigo-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Plane Spotter</h1>
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
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 pt-8 pb-6 px-4 fixed top-0 left-0 right-0 z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md">
              <Plane className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white">Plane Spotter</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="bg-white/10 px-4 py-1 rounded-full backdrop-blur-md"
            >
              <span className="text-white text-sm font-medium">@{session.user.username}</span>
            </button>
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
      <AnimatePresence>
        {showGuessModal && currentGuessSpot && (
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-b from-white to-blue-50 rounded-3xl max-w-md w-full p-6 shadow-xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl">
                  <Plane className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">What Did You Spot?</h3>
                  <p className="text-sm text-gray-500">
                    {newSpots.length} plane{newSpots.length > 1 ? "s" : ""} left to guess
                  </p>
                </div>
              </div>

              <div className="mb-6 overflow-hidden rounded-2xl bg-white/50 p-1">
  {currentGuessSpot && coords && (
    <Map
      center={[coords.latitude, coords.longitude]}
      spots={newSpots}
      highlightedSpot={currentGuessSpot}
    />
  )}
</div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aircraft Type
                  </label>
                  <select 
  value={guessedType}
  onChange={(e) => setGuessedType(e.target.value)}
  className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
>
  <option value="">Select Type</option>
  {aircraftTypeOptions.map(type => (
    <option key={type.code} value={type.code}>
      ({type.code}) {type.name}
    </option>
  ))}
</select>
          </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Airline
                  </label>
                  <select
                    value={guessedAirline}
                    onChange={(e) => setGuessedAirline(e.target.value)}
                    className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Airline</option>
                    {airlineOptions.map(airline => (
  <option key={airline.code} value={airline.code}>
    ({airline.code}) {airline.name}
  </option>
))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <select
                    value={guessedDestination}
                    onChange={(e) => setGuessedDestination(e.target.value)}
                    className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Destination</option>
                    {destinationOptions.map(destination => (
                      <option key={destination.code} value={destination.code}>
                        ({destination.code}) {destination.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <motion.button
                onClick={handleGuessSubmit}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-colors font-medium mt-6"
                whileTap={{ scale: 0.95 }}
              >
                Submit Guess
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Modal */}
      <AnimatePresence>
        {showResultsModal && (
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-b from-white to-blue-50 rounded-3xl max-w-md w-full p-6 shadow-xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl">
                  <Trophy className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Results</h3>
                  <p className="text-sm text-gray-500">
                    {guessResults.length} aircraft spotted
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {guessResults.map((result, index) => (
                  <motion.div
                    key={index}
                    className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-100"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-gray-900">
                        {result.spot.flight.flight || 'Unknown Flight'}
                      </span>
                      <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-medium">
                        +{result.xpEarned} XP
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Type:</span>
                        <div className="flex items-center gap-2">
                          <span className={result.isTypeCorrect ? "text-green-600" : "text-red-600"}>
                            {result.spot.guessedType || '—'}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-900">{result.spot.flight.type}</span>
                          {result.isTypeCorrect && (
                            <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center">
                              <span className="text-green-600">✓</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Airline:</span>
                        <div className="flex items-center gap-2">
                          <span className={result.isAirlineCorrect ? "text-green-600" : "text-red-600"}>
                            {result.spot.guessedAirline || '—'}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-900">{result.spot.flight.operator}</span>
                          {result.isAirlineCorrect && (
                            <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center">
                              <span className="text-green-600">✓</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Destination:</span>
                        <div className="flex items-center gap-2">
                          <span className={result.isDestinationCorrect ? "text-green-600" : "text-red-600"}>
                            {result.spot.guessedDestination || '—'}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-900">{result.spot.flight.arrivalAirport}</span>
                          {result.isDestinationCorrect && (
                            <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center">
                              <span className="text-green-600">✓</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between text-gray-500 pt-2 border-t border-gray-100">
                        <span>{result.spot.flight.alt}ft</span>
                        <span>{result.spot.flight.speed}kts</span>
                        <span>From: {result.spot.flight.departureAirport || '—'}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={() => setShowResultsModal(false)}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-colors font-medium mt-6"
                whileTap={{ scale: 0.95 }}
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  )
}
