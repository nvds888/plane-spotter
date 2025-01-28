"use client";

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Filter, CheckCircle, XCircle } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">✈️ My Collection</h1>
            <Link 
              href="/" 
              className="px-4 py-2 text-blue-500 hover:text-blue-600 transition-colors"
            >
              Back to Spotting
            </Link>
          </div>

          {/* Filter Section */}
          <div className="mt-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Filter size={20} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
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
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your collection...</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSpots.map((group) => (
                <div key={group._id} className="bg-white rounded-lg shadow-sm border">
                  <button
                    onClick={() => toggleGroup(group._id)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <h2 className="text-xl font-semibold">{formatGroupTitle(group._id)}</h2>
                      <p className="text-gray-500 text-sm">{group.count} spots</p>
                    </div>
                    {expandedGroups.has(group._id) ? (
                      <ChevronUp className="text-gray-400" />
                    ) : (
                      <ChevronDown className="text-gray-400" />
                    )}
                  </button>

                  {expandedGroups.has(group._id) && (
                    <div className="border-t p-4 space-y-4">
                      {group.spots.map((spot) => (
                        <div key={spot._id} className="bg-gray-50 rounded-lg p-4 shadow-sm">
                          <div className="space-y-4">
                            {/* Flight Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-medium">Flight</p>
                                <p className="text-gray-600">{spot.flight?.flight || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="font-medium">Operator</p>
                                <p className="text-gray-600">{spot.flight?.operator || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="font-medium">Altitude</p>
                                <p className="text-gray-600">{spot.flight?.alt ? `${spot.flight.alt}ft` : 'N/A'}</p>
                              </div>
                              <div>
                                <p className="font-medium">Speed</p>
                                <p className="text-gray-600">{spot.flight?.speed ? `${spot.flight.speed}kt` : 'N/A'}</p>
                              </div>
                            </div>

                            {/* Guess Results */}
                            {spot.guessResult && (
                              <div className="border-t pt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium">Guess Results</h4>
                                  <span className="text-green-600 font-medium">
                                    +{spot.guessResult.xpEarned} XP
                                  </span>
                                </div>
                                <div className="flex gap-4">
                                  <div className="flex items-center gap-1">
                                    {spot.guessResult.isTypeCorrect ? (
                                      <CheckCircle className="text-green-500 w-4 h-4" />
                                    ) : (
                                      <XCircle className="text-red-500 w-4 h-4" />
                                    )}
                                    <span className="text-sm">Type</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {spot.guessResult.isAltitudeCorrect ? (
                                      <CheckCircle className="text-green-500 w-4 h-4" />
                                    ) : (
                                      <XCircle className="text-red-500 w-4 h-4" />
                                    )}
                                    <span className="text-sm">Altitude</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="text-sm text-gray-500 border-t pt-3">
                              Spotted: {new Date(spot.timestamp).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}