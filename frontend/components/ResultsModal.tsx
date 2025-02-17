import { motion, AnimatePresence } from "framer-motion"
import { Trophy } from "lucide-react"
import { Spot, GuessResult } from "../types/types"

interface ResultsModalProps {
  isOpen: boolean
  onClose: () => void
  guessResults: GuessResult[]
  allSpots: Spot[]
  totalSpots: number
}

export default function ResultsModal({ 
  isOpen, 
  onClose, 
  guessResults,
  allSpots,
  totalSpots
}: ResultsModalProps) {
  if (!isOpen) return null;

  // Sort spots to show guessed ones first
  const sortedSpots = [...allSpots].sort((a, b) => {
    const aGuessed = guessResults.some(r => r.spot._id === a._id);
    const bGuessed = guessResults.some(r => r.spot._id === b._id);
    return bGuessed ? 1 : aGuessed ? -1 : 0;
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
          <div className="flex items-center gap-3 mb-6">
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

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {sortedSpots.map((spot, index) => {
              const result = guessResults.find(r => r.spot._id === spot._id);
              const wasGuessed = result !== undefined;
              
              return (
                <motion.div
                  key={spot._id}
                  className={`bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 ${
                    !wasGuessed ? 'opacity-50' : ''
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-900">
                      {spot.flight.flight || 'Unknown Flight'}
                    </span>
                    {wasGuessed && (
                      <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-medium">
                        +{result.xpEarned} XP
                      </span>
                    )}
                  </div>

                  {/* Flight Details */}
                  <div className="bg-gray-50/80 rounded-lg p-2 mb-3 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-gray-500 text-xs">Altitude</span>
                        <p className="font-medium">{spot.flight.alt.toLocaleString()}ft</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Speed</span>
                        <p className="font-medium">{spot.flight.speed}kts</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Route</span>
                        <p className="font-medium">
                          {spot.flight.departureAirport} → {spot.flight.arrivalAirport}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {wasGuessed ? (
                    <div className="space-y-2 text-sm">
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
                  ) : (
                    <div className="text-sm text-gray-500">
                      Not guessed
                    </div>
                  )}
                </motion.div>
              );
            })}
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