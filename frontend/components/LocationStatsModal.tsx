import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, X, Loader2, RefreshCw } from 'lucide-react';
import { useSession } from "next-auth/react";

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

interface FrequencyItem {
  name: string;
  count: number;
}

interface LocationStats {
  lastUpdated: string;
  lastAnalysis: string;
  location: LocationInfo;
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
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchExistingStats = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(
          `https://plane-spotter-backend.onrender.com/api/location-stats/${session.user.id}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setStats(data);
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (isOpen) {
      fetchExistingStats();
    }
  }, [isOpen, session?.user?.id]);

  const analyzeFlight = async (): Promise<void> => {
    if (!currentLocation || !session?.user?.id) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
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

      if (response.status === 429) {
        const data = await response.json();
        setError(data.message);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to analyze location');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error analyzing location:', error);
      setError('Failed to analyze location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const canRefresh = stats ? 
    new Date(stats.lastAnalysis).getTime() + 24*60*60*1000 <= Date.now() : 
    true;

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
                <p className="text-sm text-gray-500 mt-1">
                  Current aircraft traffic patterns
                  {stats?.location?.city && (
                    <span> near {stats.location.city}
                      {stats.location.country ? `, ${stats.location.country}` : ''}
                    </span>
                  )}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {error && (
              <div className="text-red-500 text-sm mb-4">
                {error}
              </div>
            )}

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
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-gray-500">
                    Last analyzed: {new Date(stats.lastAnalysis).toLocaleDateString()}
                  </span>
                  <button
                    onClick={analyzeFlight}
                    disabled={loading || !canRefresh}
                    className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm disabled:opacity-50"
                    title={!canRefresh ? "Available after 24 hours" : ""}
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Airlines */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">
                      Most Frequent Airlines
                    </h3>
                    <div className="space-y-2">
                      {stats.topAirlines.map((airline, index) => (
                        <div 
                          key={airline.name}
                          className="bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-2 rounded-lg h-10 flex items-center"
                        >
                          <span className="w-6 text-indigo-600 font-medium">
                            {index + 1}.
                          </span>
                          <span className="text-sm text-gray-900 truncate">
                            {airline.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aircraft Types */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">
                      Most Frequent Aircraft
                    </h3>
                    <div className="space-y-2">
                      {stats.topAircraftTypes.map((aircraft, index) => (
                        <div 
                          key={aircraft.name}
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 rounded-lg h-10 flex items-center"
                        >
                          <span className="w-6 text-indigo-600 font-medium">
                            {index + 1}.
                          </span>
                          <span className="text-sm text-gray-900 truncate">
                            {aircraft.name}
                          </span>
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