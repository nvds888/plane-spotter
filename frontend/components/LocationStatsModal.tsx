import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, X, Loader2, RefreshCw } from 'lucide-react';
import { useSession } from "next-auth/react";

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface FrequencyItem {
  name: string;
  count: number;
}

interface LocationStats {
  lastUpdated: string;
  topAirlines: FrequencyItem[];
  topAircraftTypes: FrequencyItem[];
  metadata?: {
    totalFlightsAnalyzed: number;
    timeOfAnalysis: string;
    radiusKm: number;
  };
}

interface LocationStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationCoordinates | null;
}

const LocationStatsModal: React.FC<LocationStatsModalProps> = ({
  isOpen,
  onClose,
  currentLocation
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const { data: session } = useSession();

  const analyzeFlight = async (): Promise<void> => {
    if (!currentLocation || !session?.user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('https://plane-spotter-backend.onrender.com/api/location-stats/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          lat: currentLocation.latitude,
          lon: currentLocation.longitude
        })
      });

      if (!response.ok) throw new Error('Failed to analyze location');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error analyzing location:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl max-w-md w-full"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Area Analysis</h2>
                <p className="text-sm text-gray-500 mt-1">Most common in your area</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {!stats ? (
              <div className="py-8">
                <button
                  onClick={analyzeFlight}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Analyzing Area...</span>
                    </>
                  ) : (
                    <>
                      <Plane size={18} />
                      <span>Analyze Area</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={analyzeFlight}
                    disabled={loading}
                    className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Airlines */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-3">Top Airlines</h3>
                    <div className="space-y-2">
                      {stats.topAirlines.map((airline) => (
                        <div 
                          key={airline.name}
                          className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg text-sm"
                        >
                          {airline.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aircraft Types */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-3">Top Aircraft</h3>
                    <div className="space-y-2">
                      {stats.topAircraftTypes.map((aircraft) => (
                        <div 
                          key={aircraft.name}
                          className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg text-sm"
                        >
                          {aircraft.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LocationStatsModal;