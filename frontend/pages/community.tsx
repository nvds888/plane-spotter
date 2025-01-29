import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, MapPin, Plane, House, BookOpen, Trophy } from "lucide-react";
import Link from "next/link";

interface Flight {
  hex: string;
  flight: string;
  type: string;
  alt: number;
  speed: number;
  operator: string;
  lat: number;
  lon: number;
}

interface Spot {
  _id: string;
  userId: string;
  username?: string;
  lat: number;
  lon: number;
  timestamp: string;
  country?: string;
  flight?: Flight;
}

export default function Community() {
  const { data: session } = useSession();
  const [friendSpots, setFriendSpots] = useState<Spot[]>([]);
  const [globalSpot, setGlobalSpot] = useState<Spot | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchFriendSpots();
    const cleanup = subscribeToGlobalSpots();
    return cleanup;
  }, [session]);

  const fetchFriendSpots = async () => {
    try {
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/friend-spots`);
      const data = await response.json();
      setFriendSpots(data);
    } catch (error) {
      console.error("Failed to fetch friend spots:", error);
    }
  };

  const subscribeToGlobalSpots = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('https://plane-spotter-backend.onrender.com/api/user/spots/latest');
        const spot = await response.json();
        
        if (spot) {
          setGlobalSpot(spot);
          setTimeout(() => setGlobalSpot(null), 3000);
        }
      } catch (error) {
        console.error("Failed to fetch global spot:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  };

  const handleAddFriend = async () => {
    try {
      const response = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendUsername })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await fetchFriendSpots();
      setShowAddFriend(false);
      setFriendUsername("");
      setError("");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white pb-6 shadow-sm">
        <div className="max-w-lg mx-auto px-4">
          <div className="pt-12 pb-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Community</h1>
              <motion.button
                onClick={() => setShowAddFriend(true)}
                className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <UserPlus size={24} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Spot Alert */}
      <AnimatePresence>
        {globalSpot && (
          <motion.div
            className="fixed top-4 right-4 left-4 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2">
                <Plane className="text-blue-500" size={16} />
                <span className="text-sm">
                  {globalSpot.flight?.type} spotted in {globalSpot.country || 'Unknown Location'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Spots Feed */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="space-y-4">
          {friendSpots.map((spot) => (
            <div key={spot._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">@{spot.username}</p>
                        <p className="text-sm text-gray-500">{formatDate(spot.timestamp)}</p>
                      </div>
                    </div>
                    <div className="ml-10">
                      <p className="text-gray-900 mb-1">
                        Spotted a {spot.flight?.type || 'Unknown Aircraft'}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin size={14} />
                        {spot.country || 'Unknown Location'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-md w-full p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Add Friend</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Friend&apos;s Username
                  </label>
                  <input
                    type="text"
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter username"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddFriend(false)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleAddFriend}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    Add Friend
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-around py-3">
            <Link 
              href="/" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <House size={24} />
              <span className="text-xs mt-1">Home</span>
            </Link>
            <Link 
              href="/community" 
              className="flex flex-col items-center text-blue-600"
            >
              <Users size={24} />
              <span className="text-xs mt-1">Community</span>
            </Link>
            <Link 
              href="/collections" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <BookOpen size={24} />
              <span className="text-xs mt-1">Collection</span>
            </Link>
            <Link 
              href="/achievements" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <Trophy size={24} />
              <span className="text-xs mt-1">Achievements</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}