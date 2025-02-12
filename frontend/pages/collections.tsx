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

type SpotCardProps = {
  spot: Spot
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full bg-gradient-to-b from-white to-blue-50 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl">
            <Filter className="text-white" size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Group By</h3>
        </div>
        
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onChange(option.id)
                onClose()
              }}
              className={`w-full p-4 rounded-xl text-left transition-colors ${
                value === option.id
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium"
                  : "bg-white/80 text-gray-700 hover:bg-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 p-4 bg-white/80 rounded-xl text-gray-700 font-medium hover:bg-white transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  )
}


const SpotCard = ({ spot }: SpotCardProps) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{spot.flight?.flight || "Unknown Flight"}</h3>
            {spot.guessResult && (
              <span className="text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1 rounded-full ml-2">
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
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Altitude</p>
                  <p className="font-medium">
                    {spot.flight?.alt ? `${spot.flight.alt.toLocaleString()} ft` : "N/A"}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Speed</p>
                  <p className="font-medium">
                    {spot.flight?.speed ? `${spot.flight.speed} kts` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4">
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-1">From</p>
                    <p className="font-medium break-words">{spot.flight?.departureAirport || "N/A"}</p>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <Plane className="text-indigo-600" size={20} />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-xs text-gray-500 mb-1">To</p>
                    <p className="font-medium break-words">{spot.flight?.arrivalAirport || "N/A"}</p>
                  </div>
                </div>
              </div>

              {spot.guessResult && (
                <div className="flex flex-wrap gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                    ${spot.guessResult.isTypeCorrect ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                    {spot.guessResult.isTypeCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span className="font-medium">Type</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                    ${spot.guessResult.isAirlineCorrect ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                    {spot.guessResult.isAirlineCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span className="font-medium">Airline</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                    ${spot.guessResult.isDestinationCorrect ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
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
      <div className="h-screen w-full bg-white/10 backdrop-blur-md flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="text-indigo-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">✈️ My Collection</h1>
              <p className="text-gray-500 mb-6">Sign in to view your spotted aircraft</p>
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
    <div className="h-screen w-full bg-white/10 backdrop-blur-md flex flex-col">
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 pt-8 pb-6 px-4 fixed top-0 left-0 right-0 z-10 rounded-xl mx-1">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md">
                <Layers className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white">My Collection</h1>
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className="bg-white/10 p-3 rounded-2xl backdrop-blur-md hover:bg-white/20 transition-colors"
            >
              <Filter className="text-white" size={20} />
            </button>
          </div>

          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Search flights, airlines, or airports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-md text-white placeholder-white/75 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 mt-[180px] mb-24 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 animate-pulse"
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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Plane className="text-white" size={32} />
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
                  className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition-colors"
                >
                  Start Spotting
                </Link>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {groupedSpots.map((group) => (
              <div key={group.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="grid grid-cols-[1fr,auto] gap-2 items-baseline" style={{ width: 'calc(100% - 48px)' }}>
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {group.title}
                    {(groupBy === 'type' || groupBy === 'date' || groupBy === 'airline') && (
  <span className="opacity-0">
    {/* Add invisible padding text */}
    {groupBy === 'airline' 
      ? 'Emirates Airlines International Extra Long Name'
      : 'Boeing 777-300ER Dreamliner Extra Long Aircraft'
    }
  </span>
)}
                  </h2>
                  <p className="text-sm text-gray-500 whitespace-nowrap">
                    {group.count} plane{group.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: expandedGroups.has(group.id) ? 180 : 0 }}
                  className={`p-2 rounded-xl flex-shrink-0 ${
                    expandedGroups.has(group.id) 
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600" 
                      : "bg-gray-50"
                  }`}
                >
                  <ChevronDown className={`${
                    expandedGroups.has(group.id) ? "text-white" : "text-gray-400"
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

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around py-4">
            <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <Home className="w-6 h-6" />
              </div>
              <span className="text-xs">Home</span>
            </Link>
            
            <Link href="/community" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs">Community</span>
            </Link>
            
            <Link href="/collections" className="flex flex-col items-center gap-1 text-indigo-600">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium">Collection</span>
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

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
          className="fixed inset-0 bg-black/60 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
            <GroupFilter
              value={groupBy}
              onChange={setGroupBy}
              onClose={() => setShowFilters(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


