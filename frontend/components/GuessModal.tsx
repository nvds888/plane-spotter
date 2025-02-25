"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Plane } from "lucide-react";
import dynamic from "next/dynamic";
import { type Spot } from "../pages/index";

interface AircraftTypeOption {
  code: string;
  name: string;
}

interface AirlineOption {
  code: string;
  name: string;
}

interface DestinationOption {
  code: string;
  name: string;
}

interface GuessModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: Spot[];
  coordinates: { latitude: number; longitude: number } | null;
  isTeleport: boolean;
  teleportCoords: { latitude: number; longitude: number } | null;
  onGuessSubmit: (spot: Spot, guessedType: string, guessedAirline: string, guessedDestination: string) => Promise<void>;
  guessedSpotIds: string[];
  guessCount: number;
  userId: string;
}

// Import Map component dynamically to prevent SSR issues
const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />,
});

const getRandomOptions = (
  allOptions: { code: string; name: string }[],
  correctOption: { code: string; name: string },
  count: number = 2
) => {
  if (!allOptions?.length || !correctOption) return [];
  
  // Filter out the correct option from other options if it exists
  const otherOptions = allOptions.filter(opt => opt.code !== correctOption.code);

  // Randomly select additional options
  const randomOptions = otherOptions
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  // Combine correct option with random options and shuffle
  const finalOptions = [...randomOptions, correctOption]
    .sort(() => Math.random() - 0.5);

  return finalOptions;
};

const GuessModal: React.FC<GuessModalProps> = ({
  isOpen,
  onClose,
  spots,
  coordinates,
  isTeleport,
  teleportCoords,
  onGuessSubmit,
  guessedSpotIds,
  guessCount,
  userId
}) => {
  const [currentGuessSpot, setCurrentGuessSpot] = useState<Spot | null>(null);
  const [guessedType, setGuessedType] = useState("");
  const [guessedAirline, setGuessedAirline] = useState("");
  const [guessedDestination, setGuessedDestination] = useState("");
  const [aircraftTypeOptions, setAircraftTypeOptions] = useState<AircraftTypeOption[]>([]);
  const [airlineOptions, setAirlineOptions] = useState<AirlineOption[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<DestinationOption[]>([]);
  const [randomizedTypeOptions, setRandomizedTypeOptions] = useState<AircraftTypeOption[]>([]);
  const [randomizedAirlineOptions, setRandomizedAirlineOptions] = useState<AirlineOption[]>([]);
  const [randomizedDestOptions, setRandomizedDestinationOptions] = useState<DestinationOption[]>([]);
  const [optionsGenerated, setOptionsGenerated] = useState<string | null>(null);

  // Fetch suggestions for guessing options
  useEffect(() => {
    if (isOpen && coordinates && userId) {
      fetchSuggestions();
    }
  }, [isOpen, coordinates, userId]);

  // Initialize the current guess spot when modal opens
  useEffect(() => {
    if (isOpen && spots.length > 0) {
      // If 3 or fewer spots, start with the first one
      // If more than 3, user must select one
      if (spots.length <= 3) {
        const firstUnguessedSpot = spots.find(spot => !guessedSpotIds.includes(spot._id));
        setCurrentGuessSpot(firstUnguessedSpot || null);
      } else {
        setCurrentGuessSpot(null);
      }
    }
  }, [isOpen, spots, guessedSpotIds]);

  // Generate randomized options for the current spot
  useEffect(() => {
    // Only regenerate options if we have a new spot or haven't generated for this spot yet
    if (currentGuessSpot && 
        aircraftTypeOptions?.length > 0 && 
        airlineOptions?.length > 0 && 
        destinationOptions?.length > 0 &&
        optionsGenerated !== currentGuessSpot._id) {
      
      // Store the current spot ID to prevent regeneration
      setOptionsGenerated(currentGuessSpot._id);
      
      // Create option objects for the current spot's correct values
      const correctTypeOption = {
        code: currentGuessSpot.flight.type,
        name: aircraftTypeOptions.find(opt => opt.code === currentGuessSpot.flight.type)?.name || currentGuessSpot.flight.type
      };
  
      const correctAirlineOption = {
        code: currentGuessSpot.flight.operating_as || currentGuessSpot.flight.painted_as,
        name: currentGuessSpot.flight.operator 
      };
  
      const correctDestOption = {
        code: currentGuessSpot.flight.dest_iata,
        name: currentGuessSpot.flight.arrivalAirport
      };
  
      // Generate randomized options including correct answers
      setRandomizedTypeOptions(getRandomOptions(
        aircraftTypeOptions,
        correctTypeOption,
        2
      ));
      
      setRandomizedAirlineOptions(getRandomOptions(
        airlineOptions,
        correctAirlineOption,
        2
      ));
      
      setRandomizedDestinationOptions(getRandomOptions(
        destinationOptions,
        correctDestOption,
        2
      ));
    }
  }, [currentGuessSpot, aircraftTypeOptions, airlineOptions, destinationOptions, optionsGenerated]);

  const fetchSuggestions = async () => {
    if (!coordinates || !userId) return;
    
    try {
      const encodedUserId = encodeURIComponent(userId);
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/flights/suggestions?lat=${coordinates.latitude}&lon=${coordinates.longitude}&userId=${encodedUserId}`
      );
      
      const data = await response.json();
      setAircraftTypeOptions(data.aircraftTypes);
      setAirlineOptions(data.airlines);
      setDestinationOptions(data.destinations);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  };

  const handleGuessSubmit = async () => {
    if (!currentGuessSpot) return;
    
    // Call the parent component's onGuessSubmit function
    await onGuessSubmit(currentGuessSpot, guessedType, guessedAirline, guessedDestination);
    
    // Reset form fields
    setGuessedType("");
    setGuessedAirline("");
    setGuessedDestination("");
    setOptionsGenerated(null);
    
    // If more than 3 spots, let the user select another one
    // If 3 or fewer, find the next unguessed spot
    if (spots.length > 3) {
      if (guessCount >= 2) { // Already made 3 guesses (including this one)
        onClose();
      } else {
        setCurrentGuessSpot(null);
      }
    } else {
      // Find the next unguessed spot
      const nextSpot = spots.find(spot => 
        !guessedSpotIds.includes(spot._id) && 
        spot._id !== currentGuessSpot._id
      );
      
      if (nextSpot) {
        setCurrentGuessSpot(nextSpot);
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const centerCoordinates = isTeleport && teleportCoords 
    ? [teleportCoords.latitude, teleportCoords.longitude] as [number, number]
    : coordinates 
      ? [coordinates.latitude, coordinates.longitude] as [number, number]
      : [0, 0] as [number, number];

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
              <Plane className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {spots.length > 3 
                  ? currentGuessSpot ? "What Did You Spot?" : "Select Aircraft to Guess"
                  : "What Did You Spot?"}
              </h3>
              <p className="text-sm text-gray-500">
                {spots.length > 3 
                  ? `${guessCount}/3 guesses made` 
                  : `${spots.length - guessedSpotIds.length} plane${spots.length - guessedSpotIds.length !== 1 ? "s" : ""} left to guess`}
              </p>
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-2xl bg-white/50 p-1">
            <Map
              center={centerCoordinates}
              spots={spots}
              highlightedSpot={currentGuessSpot}
              isSelectable={spots.length > 3}
              onSpotSelect={spots.length > 3 ? (spot) => setCurrentGuessSpot(spot) : undefined}
              guessedSpotIds={guessedSpotIds}
            />
          </div>

          {currentGuessSpot ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aircraft Type
                </label>
                <select 
                  value={guessedType}
                  onChange={(e) => setGuessedType(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Type</option>
                  {randomizedTypeOptions.map(type => (
                    <option key={type.code} value={type.code}>
                      ({type.code}) {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Airline
                </label>
                <select
                  value={guessedAirline}
                  onChange={(e) => setGuessedAirline(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Airline</option>
                  {randomizedAirlineOptions.map(airline => (
                    <option key={airline.code} value={airline.code}>
                      ({airline.code}) {airline.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination
                </label>
                <select
                  value={guessedDestination}
                  onChange={(e) => setGuessedDestination(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Destination</option>
                  {randomizedDestOptions.map(destination => (
                    <option key={destination.code} value={destination.code}>
                      ({destination.code}) {destination.name}
                    </option>
                  ))}
                </select>
              </div>

              <motion.button
                onClick={handleGuessSubmit}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-colors font-medium mt-6"
                whileTap={{ scale: 0.95 }}
              >
                Submit Guess
              </motion.button>
            </div>
          ) : spots.length > 3 ? (
            <p className="text-center text-gray-500 text-sm">
              Click on an aircraft to make your guess
            </p>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuessModal;