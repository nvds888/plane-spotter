"use client";

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Filter, CheckCircle, XCircle, Home, Layers, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Flight = {
  hex: string;
  flight: string;
  type: string;
  alt: number;
  speed: number;
  operator: string;
  lat: number;
  lon: number;
};

type GuessResult = {
  isTypeCorrect: boolean;
  isAltitudeCorrect: boolean;
  xpEarned: number;
};

type Spot = {
  _id: string;
  userId: string;
  lat: number;
  lon: number;
  timestamp: string;
  flight?: Flight;
  guessResult?: GuessResult;
};

type GroupedSpot = {
  _id: string;
  count: number;
  spots: Spot[];
};

type GroupBy = 'type' | 'date' | 'airline' | 'altitude';

export default function Collection() {
  const { data: session } = useSession();
  const [groupedSpots, setGroupedSpots] = useState<GroupedSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchGroupedSpots = async () => {
      if (!session?.user?.id) return;
      setIsLoading(true);
      
      try {
        const response = await fetch(
          `https://plane-spotter-backend.onrender.com/api/spot/grouped?userId=${session.user.id}&groupBy=${groupBy}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch spots: ${response.statusText}`);
        }

        const data = await response.json();
        setGroupedSpots(data);
      } catch (error) {
        console.error('Failed to fetch spots:', error);
        alert('Failed to load collection. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupedSpots();
  }, [session, groupBy]);

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const formatGroupTitle = (id: string) => {
    if (!id) return 'Unknown';
    
    switch (groupBy) {
      case 'date':
        return new Date(id).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
      case 'altitude':
        return id;
      case 'airline':
        return `${id} Airlines`;
      default:
        return id;
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-800">✈️ My Collection</h1>
          <p className="text-gray-600">Sign in to view your collection</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signin" 
              className="btn-primary">
              Sign In
            </Link>
            <Link href="/auth/signup" 
              className="btn-secondary">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* iOS-style status bar */}
      <div className="h-6 bg-white" />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">✈️ Collection</h1>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Filter size={20} />
          </button>
        </div>

        {/* Filter Options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-100"
            >
              <div className="px-4 py-4 bg-white">
                <h3 className="font-medium mb-3 text-gray-700">Group planes by:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['type', 'date', 'airline', 'altitude'] as GroupBy[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setGroupBy(option);
                        setExpandedGroups(new Set());
                        setShowFilters(false);
                      }}
                      className={`px-4 py-3 rounded-xl capitalize font-medium ${
                        groupBy === option
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option}
                    </button>
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
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded-lg w-1/4" />
              </div>
            ))}
          </div>
        ) : groupedSpots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm p-6">
            <p className="text-gray-500 mb-4">No planes in your collection yet!</p>
            <Link 
              href="/"
              className="btn-primary"
            >
              Start Spotting
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedSpots.map((group) => (
              <motion.div 
                key={group._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm"
              >
                <button
                  onClick={() => toggleGroup(group._id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">
                      {formatGroupTitle(group._id)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {group.count} plane{group.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronDown 
                    className={`text-gray-400 transition-transform duration-200 ${
                      expandedGroups.has(group._id) ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {expandedGroups.has(group._id) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
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
                                <h4 className="font-medium text-gray-800">
                                  {spot.flight?.flight || 'Unknown Flight'}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {spot.flight?.operator || 'Unknown Operator'}
                                </p>
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
                                  {spot.flight?.alt ? `${spot.flight.alt.toLocaleString()} ft` : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Speed</p>
                                <p className="font-medium">
                                  {spot.flight?.speed ? `${spot.flight.speed} kts` : 'N/A'}
                                </p>
                              </div>
                            </div>

                            {spot.guessResult && (
                              <div className="flex gap-4 text-sm">
                                <div className={`flex items-center gap-1 ${
                                  spot.guessResult.isTypeCorrect ? 'text-green-600' : 'text-red-500'
                                }`}>
                                  {spot.guessResult.isTypeCorrect ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  <span>Type</span>
                                </div>
                                <div className={`flex items-center gap-1 ${
                                  spot.guessResult.isAltitudeCorrect ? 'text-green-600' : 'text-red-500'
                                }`}>
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
                              {new Date(spot.timestamp).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
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
  );
}