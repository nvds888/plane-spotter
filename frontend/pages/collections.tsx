"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronDown, Filter, CheckCircle, XCircle, Home, Layers, User } from "lucide-react"
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-500 to-blue-600">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-4xl font-bold text-white">✈️ My Collection</h1>
          <p className="text-blue-100">Sign in to view your collection</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* iOS-style status bar */}
      <div className="h-6 bg-blue-500" />

      {/* Header */}
      <header className="bg-blue-500 text-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">✈️ Collection</h1>
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-full hover:bg-blue-400 transition-colors"
            whileTap={{ scale: 0.9 }}
          >
            <Filter size={20} />
          </motion.button>
        </div>

        {/* Filter Options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-blue-400"
            >
              <div className="px-4 py-4 bg-blue-500">
                <h3 className="font-medium mb-3 text-blue-100">Group planes by:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(["type", "date", "airline", "altitude"] as GroupBy[]).map((option) => (
                    <motion.button
                      key={option}
                      onClick={() => {
                        setGroupBy(option)
                        setExpandedGroups(new Set())
                        setShowFilters(false)
                      }}
                      className={`px-4 py-3 rounded-xl capitalize font-medium ${
                        groupBy === option
                          ? "bg-blue-400 text-white shadow-sm"
                          : "bg-blue-600 text-blue-100 hover:bg-blue-700"
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
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20 max-w-lg mx-auto">
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
                <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded-lg w-1/4" />
              </motion.div>
            ))}
          </div>
        ) : groupedSpots.length === 0 ? (
          <motion.div
            className="text-center py-12 bg-white rounded-2xl shadow-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-gray-500 mb-4">No planes in your collection yet!</p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
            >
              Start Spotting
            </Link>
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
                    <h3 className="font-semibold text-lg text-gray-800">{formatGroupTitle(group._id)}</h3>
                    <p className="text-sm text-gray-500">
                      {group.count} plane{group.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedGroups.has(group._id) ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="text-gray-400" />
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
                            className="bg-gray-50 p-4 rounded-xl"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium text-gray-800">{spot.flight?.flight || "Unknown Flight"}</h4>
                                <p className="text-sm text-gray-500">{spot.flight?.operator || "Unknown Operator"}</p>
                              </div>
                              {spot.guessResult && (
                                <span className="text-green-500 text-sm font-medium bg-green-50 px-2 py-1 rounded-lg">
                                  +{spot.guessResult.xpEarned} XP
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                              <div>
                                <p className="text-gray-500">Altitude</p>
                                <p className="font-medium">
                                  {spot.flight?.alt ? `${spot.flight.alt.toLocaleString()} ft` : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Speed</p>
                                <p className="font-medium">{spot.flight?.speed ? `${spot.flight.speed} kts` : "N/A"}</p>
                              </div>
                            </div>

                            {spot.guessResult && (
                              <div className="flex gap-4 text-sm">
                                <div
                                  className={`flex items-center gap-1 ${
                                    spot.guessResult.isTypeCorrect ? "text-green-600" : "text-red-500"
                                  }`}
                                >
                                  {spot.guessResult.isTypeCorrect ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  <span>Type</span>
                                </div>
                                <div
                                  className={`flex items-center gap-1 ${
                                    spot.guessResult.isAltitudeCorrect ? "text-green-600" : "text-red-500"
                                  }`}
                                >
                                  {spot.guessResult.isAltitudeCorrect ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  <span>Altitude</span>
                                </div>
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
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
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg safe-area-bottom">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          <Link href="/" className="p-2 text-gray-500 flex flex-col items-center">
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/collections" className="p-2 text-blue-500 flex flex-col items-center">
            <Layers size={24} />
            <span className="text-xs mt-1">Collection</span>
          </Link>
          <Link href="/profile" className="p-2 text-gray-500 flex flex-col items-center">
            <User size={24} />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}

