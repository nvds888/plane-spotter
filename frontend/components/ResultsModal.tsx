import { motion, AnimatePresence } from "framer-motion"
import { Trophy, ChevronDown, ChevronUp, Plane } from "lucide-react"
import { Spot, GuessResult } from "../types/types"
import { useState } from "react"

interface ResultsModalProps {
  isOpen: boolean
  onClose: () => void
  guessResults: GuessResult[]
  allSpots: Spot[]
  totalSpots: number
}

const SpotResult = ({ spot, result }: { spot: Spot, result?: GuessResult }) => {
  const [expanded, setExpanded] = useState(false)
  const wasGuessed = result !== undefined
  
  // Calculate correct guesses if spot was guessed
  const correctGuesses = wasGuessed ? 
    [result.isTypeCorrect, result.isAirlineCorrect, result.isDestinationCorrect]
      .filter(Boolean).length : 0

  return (
    <motion.div
      className={`bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 ${
        !wasGuessed ? 'opacity-50' : ''
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header with flight info and score */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">
            {spot.flight.flight || 'Unknown Flight'}
          </span>
          <span className="text-sm text-gray-500">
            {spot.flight.operator}
          </span>
        </div>
        {wasGuessed && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-medium">
              {correctGuesses}/3 correct
            </span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
              +{result.xpEarned} XP
            </span>
          </div>
        )}
      </div>

      {/* Guesses Section */}
      {wasGuessed && (
        <div className="space-y-2 text-sm mb-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Type:</span>
            <div className="flex items-center gap-2">
              <span className={result.isTypeCorrect ? "text-green-600" : "text-red-600"}>
                {spot.guessedType || '—'}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-900">{spot.flight.type}</span>
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
                {spot.guessedAirline || '—'}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-900">{spot.flight.operator}</span>
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
                {spot.guessedDestination || '—'}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-900">{spot.flight.arrivalAirport}</span>
              {result.isDestinationCorrect && (
                <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center">
                  <span className="text-green-600">✓</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expandable Details Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp size={16} />
            <span>Hide details</span>
          </>
        ) : (
          <>
            <ChevronDown size={16} />
            <span>Show details</span>
          </>
        )}
      </button>

      {/* Expandable Details Section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-3">
                  <span className="text-xs text-gray-500">Altitude</span>
                  <p className="font-medium">{spot.flight.alt.toLocaleString()}ft</p>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-3">
                  <span className="text-xs text-gray-500">Speed</span>
                  <p className="font-medium">{spot.flight.speed}kts</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4">
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-1">From</p>
                    <p className="font-medium break-words">
                      {spot.flight.departureAirport}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Plane className="text-indigo-600" size={20} />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-xs text-gray-500 mb-1">To</p>
                    <p className="font-medium break-words">
                      {spot.flight.arrivalAirport}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ResultsModal({ 
  isOpen, 
  onClose, 
  guessResults,
  allSpots,
  totalSpots
}: ResultsModalProps) {
  if (!isOpen) return null;

  // Calculate total stats
  const totalCorrectGuesses = guessResults.reduce((total, result) => {
    return total + [
      result.isTypeCorrect,
      result.isAirlineCorrect,
      result.isDestinationCorrect
    ].filter(Boolean).length;
  }, 0);
  
  const totalPossibleGuesses = guessResults.length * 3;
  const totalXPEarned = guessResults.reduce((total, result) => total + result.xpEarned, 0);

  // Sort spots to show guessed ones first
  const sortedSpots = [...allSpots].sort((a, b) => {
    const aGuessed = guessResults.some(r => r.spot._id === a._id);
    const bGuessed = guessResults.some(r => r.spot._id === b._id);
    return bGuessed ? -1 : aGuessed ? 1 : 0;
  });

  return (
    <AnimatePresence>
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
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl">
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Results</h3>
              <p className="text-sm text-gray-500">
                {totalSpots > 3 
                  ? `${guessResults.length} of ${totalSpots} aircraft guessed`
                  : `${guessResults.length} aircraft spotted`}
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/80 rounded-xl p-3">
              <span className="text-sm text-gray-500">Correct Guesses</span>
              <p className="text-lg font-bold text-indigo-600">
                {totalCorrectGuesses}/{totalPossibleGuesses}
              </p>
            </div>
            <div className="bg-white/80 rounded-xl p-3">
              <span className="text-sm text-gray-500">Total XP</span>
              <p className="text-lg font-bold text-indigo-600">
                +{totalXPEarned}
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {sortedSpots.map((spot) => (
              <SpotResult
                key={spot._id}
                spot={spot}
                result={guessResults.find(r => r.spot._id === spot._id)}
              />
            ))}
          </div>

          <motion.button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-colors font-medium mt-6"
            whileTap={{ scale: 0.95 }}
          >
            Continue
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}