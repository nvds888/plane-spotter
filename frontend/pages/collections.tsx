"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ChevronDown, Filter, CheckCircle, XCircle, Home, Layers, Trophy, Users, Plane } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import _ from 'lodash'

type Flight = {
  hex: string
  flight: string
  type: string
  alt: number
  speed: number
  operator: string
  lat: number
  lon: number
  departureAirport: string
  arrivalAirport: string
}

type GuessResult = {
  isTypeCorrect: boolean
  isAirlineCorrect: boolean
  isDestinationCorrect: boolean
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

type GroupBy = "type" | "airline" | "date" | "altitude"

type GroupFilterProps = {
  value: GroupBy
  onChange: (value: GroupBy) => void
  onClose: () => void
}

type ExpandedGroups = Set<string>

const GroupFilter = ({ value, onChange, onClose }: GroupFilterProps) => {
  const options: { id: GroupBy; label: string }[] = [
    { id: 'type', label: 'Aircraft Type' },
    { id: 'airline', label: 'Airline' },
    { id: 'date', label: 'Date' },
    { id: 'altitude', label: 'Altitude Range' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
      >
        <h3 className="text-xl font-semibold mb-4">Group By</h3>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onChange(option.id)
                onClose()
              }}
              className={`w-full p-4 rounded-xl text-left ${
                value === option.id
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "bg-gray-50 text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 p-4 bg-gray-100 rounded-xl text-gray-700 font-medium"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  )
}

type SpotCardProps = {
  spot: Spot
}

const SpotCard = ({ spot }: SpotCardProps) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      className="bg-white rounded-xl shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{spot.flight?.flight || "Unknown Flight"}</h3>
            {spot.guessResult && (
              <span className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full ml-2">
                +{spot.guessResult.xpEarned} XP
              </span>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <span>{spot.flight?.operator || "Unknown Operator"}</span>
            <span className="mx-2">•</span>
            <span>{spot.flight?.type || "Unknown Type"}</span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          className="ml-4"
        >
          <ChevronDown className="text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Altitude</p>
                  <p className="font-medium">
                    {spot.flight?.alt ? `${spot.flight.alt.toLocaleString()} ft` : "N/A"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Speed</p>
                  <p className="font-medium">
                    {spot.flight?.speed ? `${spot.flight.speed} kts` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 items-center">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-1">From</p>
                    <p className="font-medium truncate">{spot.flight?.departureAirport || "N/A"}</p>
                  </div>
                  <div className="text-center">
                    <Plane className="text-gray-400 transform -rotate-90 mx-auto" size={20} />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-xs text-gray-500 mb-1">To</p>
                    <p className="font-medium truncate">{spot.flight?.arrivalAirport || "N/A"}</p>
                  </div>
                </div>
              </div>

              {spot.guessResult && (
                <div className="flex flex-wrap gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                    ${spot.guessResult.isTypeCorrect ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                    {spot.guessResult.isTypeCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span className="font-medium">Type</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                    ${spot.guessResult.isAirlineCorrect ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                    {spot.guessResult.isAirlineCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span className="font-medium">Airline</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                    ${spot.guessResult.isDestinationCorrect ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                    {spot.guessResult.isDestinationCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span className="font-medium">Destination</span>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Collection() {
  const { data: session } = useSession()
  const [spots, setSpots] = useState<Spot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupBy>("type")
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<ExpandedGroups>(new Set())

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  useEffect(() => {
    const fetchSpots = async () => {
      if (!session?.user?.id) return
      setIsLoading(true)

      try {
        const response = await fetch(
          `https://plane-spotter-backend.onrender.com/api/spot/all?userId=${session.user.id}`
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch spots: ${response.statusText}`)
        }

        const data = await response.json()
        setSpots(data)
      } catch (error) {
        console.error("Failed to fetch spots:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSpots()
  }, [session])

  const groupedSpots = useMemo(() => {
    if (!spots.length) return []

    const filteredSpots = spots.filter(spot => {
      const searchLower = searchTerm.toLowerCase()
      return (
        spot.flight?.flight?.toLowerCase().includes(searchLower) ||
        spot.flight?.operator?.toLowerCase().includes(searchLower) ||
        spot.flight?.type?.toLowerCase().includes(searchLower) ||
        spot.flight?.departureAirport?.toLowerCase().includes(searchLower) ||
        spot.flight?.arrivalAirport?.toLowerCase().includes(searchLower)
      )
    })

    let grouped: Record<string, Spot[]>
    switch (groupBy) {
      case 'type':
        grouped = _.groupBy(filteredSpots, spot => spot.flight?.type || 'Unknown')
        break
      case 'airline':
        grouped = _.groupBy(filteredSpots, spot => spot.flight?.operator || 'Unknown')
        break
      case 'date':
        grouped = _.groupBy(filteredSpots, spot => {
          const date = new Date(spot.timestamp)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        })
        break
      case 'altitude':
        grouped = _.groupBy(filteredSpots, spot => {
          const alt = spot.flight?.alt || 0
          if (alt < 10000) return 'Low Altitude (0-10,000 ft)'
          if (alt < 30000) return 'Medium Altitude (10,000-30,000 ft)'
          return 'High Altitude (30,000+ ft)'
        })
        break
      default:
        grouped = _.groupBy(filteredSpots, spot => spot.flight?.type || 'Unknown')
    }

    return Object.entries(grouped)
      .map(([key, groupSpots]) => ({
        id: key,
        title: key,
        count: groupSpots.length,
        spots: groupSpots
      }))
      .sort((a, b) => b.count - a.count)
  }, [spots, groupBy, searchTerm])

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
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Fixed Header */}
<div className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">  {/* Changed z-40 to z-50 */}
  <div className="max-w-lg mx-auto px-4">
    <div className="pt-12 pb-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Collection</h1>
          <div className="flex gap-4">
            <div className="text-sm text-gray-500">View and organize your spotted aircraft</div>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
        >
          <Filter size={20} />
        </button>
      </div>

      <div className="relative mt-4">
        <input
          type="text"
          placeholder="Search flights, airlines, or airports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-gray-50 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
    {/* Add white background extension to prevent content showing through */}
    <div className="absolute bottom-0 left-0 right-0 h-4 bg-white" />
  </div>
</div>

{/* Main Content */}
<div className="max-w-lg mx-auto px-4 pt-40">
      {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="bg-white rounded-xl p-4 animate-pulse"
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? "No matches found" : "No Planes Yet!"}
              </h2>
              <p className="text-gray-500 mb-6">
                {searchTerm ? "Try adjusting your search terms" : "Start your collection by spotting aircraft"}
              </p>
              {!searchTerm && (
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  Start Spotting
                </Link>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {groupedSpots.map((group) => (
              <div key={group.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {group.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {group.count} plane{group.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedGroups.has(group.id) ? 180 : 0 }}
                    className={`p-2 rounded-full ${
                      expandedGroups.has(group.id) ? "bg-blue-50" : "bg-gray-50"
                    }`}
                  >
                    <ChevronDown className={`${
                      expandedGroups.has(group.id) ? "text-blue-500" : "text-gray-400"
                    }`} />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {expandedGroups.has(group.id) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3 border-t border-gray-100">
                        {group.spots.map((spot) => (
                          <SpotCard key={spot._id} spot={spot} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilters && (
          <GroupFilter
            value={groupBy}
            onChange={setGroupBy}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

