"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useGeolocated } from "react-geolocated"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, House, BookOpen, Users, MapPin, Plane } from "lucide-react"

type Flight = {
  hex: string
  flight: string
  type: string
  alt: number
  speed: number
  operator: string
  lat: number
  lon: number
  departureairport?: string  // Add this
  arrivalairport?: string    // Add this
}

// Define the API response type from Aviation Edge
type AviationEdgeFlight = {
  aircraft: {
    iataCode?: string
    icao24?: string
    icaoCode?: string
    regNumber?: string
  }
  airline: {
    iataCode?: string
    icaoCode?: string
  }
  arrival: {
    iataCode?: string
    icaoCode?: string
  }
  departure: {
    iataCode?: string
    icaoCode?: string
  }
  flight: {
    iataNumber?: string
    icaoNumber?: string
    number?: string
  }
  geography: {
    altitude?: number
    direction?: number
    latitude?: number
    longitude?: number
  }
  speed: {
    horizontal?: number
    isGround?: number
    vspeed?: number
  }
  status?: string
  system: {
    squawk?: string
    updated?: number
  }
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
  const [spots, setSpots] = useState<Spot[]>([])
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
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`)
        if (!response.ok) throw new Error("Failed to fetch XP")
        const data = await response.json()
        setUserXP(data)
      } catch (error) {
        console.error("Failed to fetch XP:", error)
      }
    }
    fetchUserXP()
  }, [session])

  useEffect(() => {
    const fetchSpots = async () => {
      if (!session?.user?.id) return
      try {
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/spot?userId=${session.user.id}`)
        if (!response.ok) throw new Error("Failed to fetch spots")
        const data: Spot[] = await response.json()
        setSpots(data)
      } catch (error) {
        console.error("Failed to fetch spots:", error)
      }
    }
    fetchSpots()
  }, [session])

  const handleSpot = async () => {
    if (!coords || isLoading || !session?.user?.id) return
    setIsLoading(true)
  
    try {
      const flightsResponse = await fetch(
        `https://plane-spotter-backend.onrender.com/api/flights/nearby?lat=${coords.latitude}&lon=${coords.longitude}`,
      )
  
      if (!flightsResponse.ok) throw new Error("Failed to fetch flights")
      const flights: AviationEdgeFlight[] = await flightsResponse.json()
  
      if (!flights.length) {
        alert("No flights detected within visible range!")
        return
      }
  
      const savedSpots: Spot[] = []
      for (const flight of flights) {
        const requestBody = {
          userId: session.user.id,
          lat: coords.latitude,
          lon: coords.longitude,
          flight // Send complete Aviation Edge data
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
  
      setSpots((prev) => [...prev, ...savedSpots])
      alert(`Spotted ${savedSpots.length} flights!`)
  
      const xpResponse = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/xp`)
      const xpData = await xpResponse.json()
      setUserXP(xpData)
  
      if (savedSpots.length > 0) {
        setNewSpots(savedSpots)
        setCurrentGuessSpot(savedSpots[0])
        setShowGuessModal(true)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      alert(`Spotting failed: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

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
      <div className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane className="text-blue-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">✈️ Plane Spotter</h1>
            <p className="text-gray-500">Join the community of aviation enthusiasts</p>
          </div>
          
          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="block w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-center transition duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="block w-full py-3 px-4 bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-50 rounded-xl font-medium text-center transition duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white pb-6 shadow-sm">
        <div className="max-w-lg mx-auto px-4">
        <div className="pt-12 pb-4">
  <div className="flex justify-between items-center">
    <h1 className="text-2xl font-bold text-gray-900">✈️ Plane Spotter</h1>
    <div className="flex flex-col items-end gap-2">
      <div className="text-gray-900 text-sm font-bold">
        @{session.user.username}
      </div>
      <div className="flex gap-3">
        <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
          Weekly XP: {userXP.weeklyXP}
        </div>
        <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-medium">
          Total XP: {userXP.totalXP}
        </div>
      </div>
    </div>
  </div>
</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-8 flex-1 flex items-center justify-center" style={{ minHeight: "calc(100vh - 280px)" }}>
        {isClient && isGeolocationAvailable ? (
          <div className="flex flex-col items-center">
            <motion.button
              onClick={handleSpot}
              disabled={isLoading}
              className={`w-48 h-48 rounded-full font-bold shadow-lg flex flex-col items-center justify-center gap-3 ${
                isLoading ? "bg-gray-100" : "bg-white hover:bg-blue-50"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <div className={`p-4 rounded-full ${isLoading ? "bg-gray-200" : "bg-blue-100"}`}>
                <MapPin className={`${isLoading ? "text-gray-400" : "text-blue-500"}`} size={32} />
              </div>
              <span className={`text-lg ${isLoading ? "text-gray-400" : "text-blue-500"}`}>
                {isLoading ? "Spotting..." : "SPOT PLANE"}
              </span>
            </motion.button>
            
            {spots.length > 0 && (
              <div className="mt-6 text-center">
                <span className="text-gray-500">
                  You&apos;ve spotted {spots.length} aircraft today
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <MapPin className="text-amber-500 mx-auto mb-3" size={24} />
            <p className="text-amber-700">
              {isClient ? "Enable GPS to start spotting!" : "Loading..."}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-around py-3">
            <Link 
              href="/" 
              className="flex flex-col items-center text-blue-600"
            >
              <House size={24} />
              <span className="text-xs mt-1">Home</span>
            </Link>
            <Link 
              href="/community" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <Users size={24} />
              <span className="text-xs mt-1">Community</span>
            </Link>
            <Link 
              href="/collections" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <BookOpen size={24} />
              <span className="text-xs mt-1">Collection</span>
            </Link>
            <Link 
              href="/achievements" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <Trophy size={24} />
              <span className="text-xs mt-1">Achievements</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Guess Modal */}
      {/* Guess Modal */}
<AnimatePresence>
  {showGuessModal && currentGuessSpot && (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl max-w-md w-full p-6"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Plane className="text-blue-500" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">What Did You Spot?</h3>
            <p className="text-sm text-gray-500">
              {newSpots.length} plane{newSpots.length > 1 ? "s" : ""} left to guess
            </p>
          </div>
        </div>

        <div className="mb-6">
          <Map
            center={coords ? [coords.latitude, coords.longitude] : [0, 0]}
            spots={newSpots}
            highlightedSpot={currentGuessSpot}
          />
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aircraft Type
            </label>
            <select
              value={guessedType}
              onChange={(e) => setGuessedType(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Airline
            </label>
            <select
              value={guessedAirline}
              onChange={(e) => setGuessedAirline(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Airline</option>
              <option value="AAL">American Airlines</option>
              <option value="UAL">United Airlines</option>
              <option value="DAL">Delta Air Lines</option>
              <option value="SWA">Southwest Airlines</option>
              <option value="AFR">Air France</option>
              <option value="BAW">British Airways</option>
              <option value="DLH">Lufthansa</option>
              <option value="UAE">Emirates</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination
            </label>
            <select
              value={guessedDestination}
              onChange={(e) => setGuessedDestination(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Destination</option>
              <option value="JFK">New York (JFK)</option>
              <option value="LAX">Los Angeles (LAX)</option>
              <option value="ORD">Chicago (ORD)</option>
              <option value="LHR">London (LHR)</option>
              <option value="CDG">Paris (CDG)</option>
              <option value="DXB">Dubai (DXB)</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <motion.button
          onClick={handleGuessSubmit}
          className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium mt-6"
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl max-w-md w-full p-6"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 rounded-xl">
            <Trophy className="text-green-500" size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Results</h3>
        </div>

        <div className="space-y-4">
          {guessResults.map((result, index) => (
            <motion.div
              key={index}
              className="p-4 bg-gray-50 rounded-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-gray-900">
                  Flight Details
                </span>
                <span className="text-sm font-medium text-green-600">
                  +{result.xpEarned} XP
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Aircraft Type:</span>
                    <span className={result.isTypeCorrect ? "text-green-600" : "text-red-600"}>
                      {result.spot.flight?.type} 
                      {result.isTypeCorrect ? " ✓" : ` (you guessed: ${result.spot.guessedType})`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Airline:</span>
                    <span className={result.isAirlineCorrect ? "text-green-600" : "text-red-600"}>
                      {result.spot.flight?.operator}
                      {result.isAirlineCorrect ? " ✓" : ` (you guessed: ${result.spot.guessedAirline})`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
  <span className="text-gray-500">Destination:</span>
  <span className={result.isDestinationCorrect ? "text-green-600" : "text-red-600"}>
    {result.spot.flight?.arrivalairport}
    {result.isDestinationCorrect ? " ✓" : ` (you guessed: ${result.spot.guessedDestination})`}
  </span>
</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.button
          onClick={() => setShowResultsModal(false)}
          className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium mt-6"
          whileTap={{ scale: 0.95 }}
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
    </div>
  )
}

