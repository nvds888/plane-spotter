"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useGeolocated } from "react-geolocated"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import {House, Layers, User, LogOut } from "lucide-react"

type Flight = {
  hex: string
  flight: string
  type: string
  alt: number
  speed: number
  operator: string
  lat: number
  lon: number
}

type Spot = {
  _id: string
  userId: string
  lat: number
  lon: number
  timestamp: string
  flight?: Flight
}

type GuessResult = {
  spot: Spot
  isTypeCorrect: boolean
  isAltitudeCorrect: boolean
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
  const [guessedAltRange, setGuessedAltRange] = useState("")
  const [userXP, setUserXP] = useState<{ totalXP: number; weeklyXP: number }>({ totalXP: 0, weeklyXP: 0 })
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [guessResults, setGuessResults] = useState<GuessResult[]>([])

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
      const flights: Flight[] = await flightsResponse.json()

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
            guessedAltitudeRange: guessedAltRange,
          }),
        },
      )

      const result = await response.json()

      setGuessResults((prev) => [
        ...prev,
        {
          spot: currentGuessSpot,
          isTypeCorrect: result.isTypeCorrect,
          isAltitudeCorrect: result.isAltitudeCorrect,
          xpEarned: result.bonusXP + 5, // Base XP (5) + Bonus XP
        },
      ])

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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-500 to-blue-600">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-4xl font-bold text-white">✈️ Plane Spotter</h1>
          <p className="text-blue-100">Sign in to start your plane spotting journey</p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="px-6 py-3 bg-white text-blue-600 rounded-full font-medium hover:bg-blue-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-blue-400 text-white rounded-full font-medium hover:bg-blue-300 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* iOS-style status bar */}
      <div className="h-6 bg-blue-500" />

      {/* Header */}
      <header className="bg-blue-500 text-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center p-4">
          <h1 className="text-2xl font-bold">✈️ Plane Spotter</h1>
          <div className="flex gap-3">
            <div className="bg-blue-400 px-3 py-1 rounded-full text-sm">
              <span className="font-semibold">Weekly XP:</span> {userXP.weeklyXP}
            </div>
            <div className="bg-blue-400 px-3 py-1 rounded-full text-sm">
              <span className="font-semibold">Total XP:</span> {userXP.totalXP}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {isClient && isGeolocationAvailable ? (
          <motion.button
            id="spot-button"
            onClick={handleSpot}
            disabled={isLoading}
            className={`w-48 h-48 rounded-full font-bold transition-all transform hover:scale-105
              flex items-center justify-center text-xl relative
              ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg"}`}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <span className="animate-spin">🌀</span>
            ) : (
              <>
                <span>SPOT PLANE</span>
                {spots.length > 0 && (
                  <motion.span
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {spots.length}
                  </motion.span>
                )}
              </>
            )}
          </motion.button>
        ) : (
          <div className="text-center p-6 bg-yellow-100 rounded-lg w-full max-w-md">
            {isClient ? "Enable GPS to start spotting!" : "Loading..."}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg safe-area-bottom">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          <Link href="/" className="p-2 text-blue-500 flex flex-col items-center">
            <House size={24} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/collections" className="p-2 text-gray-500 flex flex-col items-center">
            <Layers size={24} />
            <span className="text-xs mt-1">Collection</span>
          </Link>
          <Link href="/profile" className="p-2 text-gray-500 flex flex-col items-center">
            <User size={24} />
            <span className="text-xs mt-1">Profile</span>
          </Link>
          <button onClick={() => signOut()} className="p-2 text-gray-500 flex flex-col items-center">
            <LogOut size={24} />
            <span className="text-xs mt-1">Sign Out</span>
          </button>
        </div>
      </nav>

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
              className="bg-white p-6 rounded-2xl max-w-md w-full"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="text-xl font-bold mb-4">✈️ What Did You Spot?</h3>
              <p className="mb-4 text-sm text-gray-600">
                {newSpots.length} plane{newSpots.length > 1 ? "s" : ""} left to guess
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
                    className="w-full p-2 border rounded-lg"
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
                    {["0-10,000 ft", "10,000-30,000 ft", "30,000+ ft"].map((range) => (
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

                <motion.button
                  onClick={handleGuessSubmit}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Submit Guess
                </motion.button>
              </div>
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
              className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="text-xl font-bold mb-4">🎉 Results</h3>

              <div className="space-y-3">
                {guessResults.map((result, index) => (
                  <motion.div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{result.spot.flight?.type || "Unknown"}</span>
                      <span className="text-sm text-green-600">+{result.xpEarned} XP</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Type: {result.isTypeCorrect ? "✅" : "❌"} | Altitude: {result.isAltitudeCorrect ? "✅" : "❌"}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <motion.button
                  onClick={() => setShowResultsModal(false)}
                  className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Continue
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

