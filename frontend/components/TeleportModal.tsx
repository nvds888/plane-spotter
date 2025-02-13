import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MapPin } from 'lucide-react';

interface TeleportLocation {
  name: string;
  lat: number;
  lon: number;
  description: string;
}

interface TeleportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpot: (coords: { 
    latitude: number; 
    longitude: number;
    locationName: string;
    locationDescription: string;
  }) => Promise<void>;
}

const TELEPORT_LOCATIONS: TeleportLocation[] = [
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, description: 'Bustling Haneda Airport' },
  { name: 'Dubai, UAE', lat: 25.2532, lon: 55.3657, description: 'World\'s busiest international hub' },
  { name: 'London, UK', lat: 51.4700, lon: -0.4543, description: 'Heathrow Airport' },
  { name: 'New York, USA', lat: 40.6413, lon: -73.7781, description: 'JFK International' },
  { name: 'Singapore', lat: 1.3644, lon: 103.9915, description: 'Changi Airport' },
  { name: 'Sydney, Australia', lat: -33.9399, lon: 151.1753, description: 'Kingsford Smith Airport' },
  { name: 'Paris, France', lat: 49.0097, lon: 2.5479, description: 'Charles de Gaulle Airport' },
  { name: 'Hong Kong', lat: 22.3080, lon: 113.9185, description: 'Hong Kong International' },
];

const TeleportModal = ({ isOpen, onClose, onSpot }: TeleportModalProps): React.ReactNode => {
  const [selectedLocation, setSelectedLocation] = useState<TeleportLocation | null>(null);
  const [isSpotting, setIsSpotting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSpot = async (): Promise<void> => {
    if (!selectedLocation) return;
    
    setIsSpotting(true);
    try {
      await onSpot({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lon,
        locationName: selectedLocation.name,
        locationDescription: selectedLocation.description
      });
      onClose();
    } catch (error) {
      console.error('Teleport spotting failed:', error);
    } finally {
      setIsSpotting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl relative"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* XP Indicator */}
          <div className="absolute right-14 top-5">
            <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm font-medium">
              +10 XP
            </span>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Teleport</h3>
              <p className="text-sm text-gray-500">
                Spot planes from anywhere in the world
              </p>
            </div>
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-2 gap-3">
            {TELEPORT_LOCATIONS.map((location) => (
              <button
                key={location.name}
                onClick={() => setSelectedLocation(location)}
                className={`p-4 rounded-xl text-left transition-all ${
                  selectedLocation?.name === location.name
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-[1.02]'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start gap-2">
                  <MapPin className={`w-4 h-4 mt-1 ${
                    selectedLocation?.name === location.name
                      ? 'text-white'
                      : 'text-purple-500'
                  }`} />
                  <div>
                    <h4 className={`font-medium ${
                      selectedLocation?.name === location.name
                        ? 'text-white'
                        : 'text-gray-900'
                    }`}>{location.name}</h4>
                    <p className={`text-xs ${
                      selectedLocation?.name === location.name
                        ? 'text-white/80'
                        : 'text-gray-500'
                    }`}>{location.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Action Button */}
          <motion.button
            onClick={handleSpot}
            disabled={!selectedLocation || isSpotting}
            className={`w-full py-4 rounded-xl font-medium mt-6 ${
              selectedLocation
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {isSpotting ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Teleporting...
              </span>
            ) : (
              'Teleport & Spot'
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TeleportModal;