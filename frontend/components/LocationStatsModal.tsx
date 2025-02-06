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
      const data: LocationStats = await response.json();
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
          className="bg-white rounded-2xl max-w-lg w-full"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Location Analysis
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {!stats ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Analyze flights in your area to see which airlines and aircraft types are most common.
                </p>
                <button
                  onClick={analyzeFlight}
                  disabled={loading}
                  className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-colors disabled:bg-blue-300 flex items-center justify-center gap-2 mx-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Plane size={20} />
                      Analyze Area
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="py-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date(stats.lastUpdated).toLocaleString()}
                  </p>
                  <button
                    onClick={analyzeFlight}
                    disabled={loading}
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Airlines */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Top Airlines
                    </h3>
                    <div className="space-y-2">
                      {stats.topAirlines.map((airline: FrequencyItem) => (
                        <div 
                          key={airline.name}
                          className="flex justify-between items-center bg-white p-3 rounded-lg"
                        >
                          <span className="font-medium">{airline.name}</span>
                          <span className="text-gray-500">{airline.count} flights</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Aircraft Types */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Top Aircraft Types
                    </h3>
                    <div className="space-y-2">
                      {stats.topAircraftTypes.map((aircraft: FrequencyItem) => (
                        <div 
                          key={aircraft.name}
                          className="flex justify-between items-center bg-white p-3 rounded-lg"
                        >
                          <span className="font-medium">{aircraft.name}</span>
                          <span className="text-gray-500">{aircraft.count} flights</span>
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