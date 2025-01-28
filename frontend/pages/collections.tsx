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
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'civil', label: 'Civil' },
    { id: 'military', label: 'Military' },
    { id: 'special', label: 'Special' }
  ];

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
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup" 
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors">
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

      {/* Native-like header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold">✈️ Collection</h1>
          </div>
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
              className="overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 border-t border-b">
                <h3 className="font-medium mb-3">Group By:</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['type', 'date', 'airline', 'altitude'] as GroupBy[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => setGroupBy(option)}
                      className={`px-3 py-2 rounded-lg capitalize ${
                        groupBy === option
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
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

        {/* Horizontal scrollable tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto no-scrollbar px-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-500 font-medium'
                    : 'border-transparent text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : groupedSpots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No planes in your collection yet!</p>
            <Link 
              href="/"
              className="mt-4 inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start Spotting
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedSpots.map((group) => (
              <div 
                key={group._id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleGroup(group._id)}
                  className="w-full p-4 flex items-center justify-between bg-white"
                >
                  <div>
                    <h3 className="font-semibold text-lg">{formatGroupTitle(group._id)}</h3>
                    <p className="text-sm text-gray-500">{group.count} spots</p>
                  </div>
                  <ChevronDown 
                    className={`text-gray-400 transition-transform ${
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
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3 bg-gray-50">
                        {group.spots.map((spot) => (
                          <div 
                            key={spot._id}
                            className="bg-white p-4 rounded-xl shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium">{spot.flight?.flight || 'Unknown Flight'}</h4>
                                <p className="text-sm text-gray-500">{spot.flight?.operator || 'Unknown Operator'}</p>
                              </div>
                              {spot.guessResult && (
                                <span className="text-green-500 text-sm font-medium">
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
                              <div className="flex gap-3 text-sm">
                                <div className={`flex items-center gap-1 ${
                                  spot.guessResult.isTypeCorrect ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {spot.guessResult.isTypeCorrect ? (
                                    <CheckCircle size={16} />
                                  ) : (
                                    <XCircle size={16} />
                                  )}
                                  <span>Type</span>
                                </div>
                                <div className={`flex items-center gap-1 ${
                                  spot.guessResult.isAltitudeCorrect ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {spot.guessResult.isAltitudeCorrect ? (
                                    <CheckCircle size={16} />
                                  ) : (
                                    <XCircle size={16} />
                                  )}
                                  <span>Altitude</span>
                                </div>
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                              {new Date(spot.timestamp).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Native-like bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="flex justify-around py-2">
          <Link href="/" className="p-2 text-gray-500 flex flex-col items-center">
            <Home size={24} />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/collections" className="p-2 text-blue-500 flex flex-col items-center">
            <Layers size={24} />
            <span className="text-xs">Collection</span>
          </Link>
          <Link href="/profile" className="p-2 text-gray-500 flex flex-col items-center">
            <User size={24} />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}