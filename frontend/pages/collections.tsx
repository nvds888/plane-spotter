"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronDown, Filter, CheckCircle, XCircle, Home, Layers, Trophy, Users, Plane } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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

type GuessResult = {
  isTypeCorrect: boolean
  isAltitudeCorrect: boolean
  xpEarned: number
}

type Spot = {
  _id: string
  userId: string
  lat: number
  lon: number
  timestamp: string
  flight?: Flight
  guessResult?: GuessResult
}

type GroupedSpot = {
  _id: string
  count: number
  spots: Spot[]
}

type GroupBy = "type" | "date" | "airline" | "altitude"

export default function Collection() {
  const { data: session } = useSession()
  const [groupedSpots, setGroupedSpots] = useState<GroupedSpot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupBy>("type")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchGroupedSpots = async () => {
      if (!session?.user?.id) return
      setIsLoading(true)

      try {
        const response = await fetch(
          `https://plane-spotter-backend.onrender.com/api/spot/grouped?userId=${session.user.id}&groupBy=${groupBy}`,
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch spots: ${response.statusText}`)
        }

        const data = await response.json()
        setGroupedSpots(data)
      } catch (error) {
        console.error("Failed to fetch spots:", error)
        alert("Failed to load collection. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroupedSpots()
  }, [session, groupBy])

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const formatGroupTitle = (id: string) => {
    if (!id) return "Unknown"

    switch (groupBy) {
      case "date":
        return new Date(id).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })
      case "altitude":
        return id
      case "airline":
        return `${id} Airlines`
      default:
        return id
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">✈️ My Collection</h1>
            <p className="text-gray-500">Sign in to view your spotted aircraft</p>
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
              <h1 className="text-2xl font-bold text-gray-900">My Collection</h1>
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Filter size={20} />
              </motion.button>
            </div>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pt-4"
              >
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-medium mb-3 text-gray-700">Group planes by:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(["type", "date", "airline", "altitude"] as GroupBy[]).map((option) => (
                      <motion.button
                        key={option}
                        onClick={() => {
                          setGroupBy(option)
                          setExpandedGroups(new Set())
                          setShowFilters(false)
                        }}
                        className={`px-4 py-3 rounded-xl capitalize font-medium transition-colors ${
                          groupBy === option
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {option}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl p-4 animate-pulse"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="h-6 bg-gray-100 rounded-lg w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded-lg w-1/4" />
              </motion.div>
            ))}
          </div>
        ) : groupedSpots.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="text-blue-500" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Planes Yet!</h2>
              <p className="text-gray-500 mb-6">Start your collection by spotting aircraft</p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Start Spotting
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {groupedSpots.map((group, index) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <motion.button
                  onClick={() => toggleGroup(group._id)}
                  className="w-full p-4 flex items-center justify-between"
                  whileTap={{ scale: 0.98 }}
                >
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{formatGroupTitle(group._id)}</h3>
                    <p className="text-sm text-gray-500">
                      {group.count} plane{group.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedGroups.has(group._id) ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-2 rounded-full ${
                      expandedGroups.has(group._id) ? "bg-blue-50" : "bg-gray-50"
                    }`}
                  >
                    <ChevronDown className={`${expandedGroups.has(group._id) ? "text-blue-500" : "text-gray-400"}`} />
                  </motion.div>
                </motion.button>

                <AnimatePresence>
                  {expandedGroups.has(group._id) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3 border-t border-gray-100">
                        {group.spots.map((spot, spotIndex) => (
                          <motion.div
                            key={spot._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: spotIndex * 0.05 }}
                            className="bg-gray-50 rounded-xl p-4"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-medium text-gray-900">{spot.flight?.flight || "Unknown Flight"}</h4>
                                <p className="text-sm text-gray-500">{spot.flight?.operator || "Unknown Operator"}</p>
                              </div>
                              {spot.guessResult && (
                                <span className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full">
                                  +{spot.guessResult.xpEarned} XP
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-500 mb-1">Altitude</p>
                                <p className="font-medium text-gray-900">
                                  {spot.flight?.alt ? `${spot.flight.alt.toLocaleString()} ft` : "N/A"}
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-500 mb-1">Speed</p>
                                <p className="font-medium text-gray-900">
                                  {spot.flight?.speed ? `${spot.flight.speed} kts` : "N/A"}
                                </p>
                              </div>
                            </div>

                            {spot.guessResult && (
                              <div className="flex gap-4 mb-4">
                                <div
                                  className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                                    spot.guessResult.isTypeCorrect
                                      ? "bg-green-50 text-green-600"
                                      : "bg-red-50 text-red-500"
                                  }`}
                                >
                                  {spot.guessResult.isTypeCorrect ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  <span className="text-sm font-medium">Type</span>
                                </div>
                                <div
                                  className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                                    spot.guessResult.isAltitudeCorrect
                                      ? "bg-green-50 text-green-600"
                                      : "bg-red-50 text-red-500"
                                  }`}
                                >
                                  {spot.guessResult.isAltitudeCorrect ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  <span className="text-sm font-medium">Altitude</span>
                                </div>
                              </div>
                            )}

                            <div className="text-xs text-gray-400">
                              {new Date(spot.timestamp).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-around py-3">
            <Link 
              href="/" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <Home size={24} />
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
              className="flex flex-col items-center text-blue-600"
            >
              <Layers size={24} />
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
    </div>
  )
}

