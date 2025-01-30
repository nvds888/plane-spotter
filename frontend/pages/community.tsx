import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, MapPin, Plane, House, BookOpen, Trophy, X } from "lucide-react";
import Link from "next/link";

interface Flight {
  hex: string
  flight: string
  type: string
  alt: number
  speed: number
  operator: string
  lat: number
  lon: number
  departureAirport: string
  arrivalAirport: string
}

interface Spot {
  _id: string
  userId: {
    _id: string
    username: string
    location?: {
      city?: string
      country?: string
      lastUpdated?: Date
      coordinates?: {
        lat: number
        lon: number
      }
    }
  }
  username?: string
  lat: number
  lon: number
  timestamp: string
  country?: string
  flight?: Flight  
}

interface User {
  _id: string;
  username: string;
  email: string;
}

interface UsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    users: UserWithFollowing[];
    onAction?: (username: string) => Promise<void>;
    actionLabel?: string | ((user: UserWithFollowing) => string);
  }

interface UserWithFollowing extends User {
    isFollowing?: boolean;
  }

const UsersModal: React.FC<UsersModalProps> = ({
  isOpen,
  onClose,
  title,
  users,
  onAction,
  actionLabel
}) => (
  <AnimatePresence>
    {isOpen && (
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No users found</p>
            ) : (
              users.map((user) => (
                <div
                  key={user._id}
                  className="py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users size={20} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">@{user.username}</p>
                      </div>
                    </div>
                    {onAction && actionLabel && (
  <button
    onClick={() => !user.isFollowing && onAction(user.username)}
    className={`text-sm ${user.isFollowing ? 'text-gray-400' : 'text-blue-600 hover:text-blue-700'}`}
  >
    {typeof actionLabel === 'function' ? actionLabel(user) : actionLabel}
  </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default function Community() {
  const { data: session } = useSession();
  const [friendSpots, setFriendSpots] = useState<Spot[]>([]);
  const [globalSpot, setGlobalSpot] = useState<Spot | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [error, setError] = useState("");
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchFriendSpots();
    fetchFollowers();
    fetchFollowing();
    const cleanup = subscribeToGlobalSpots();
    return cleanup;
  }, [session]);

  const fetchFollowers = async () => {
    try {
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/followers`
      );
      const data = await response.json();
      setFollowers(data);
    } catch (error) {
      console.error("Failed to fetch followers:", error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/following`
      );
      const data = await response.json();
      setFollowing(data);
    } catch (error) {
      console.error("Failed to fetch following:", error);
    }
  };

  const handleFollow = async (username: string) => {
    try {
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/follow`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await Promise.all([fetchFollowers(), fetchFollowing(), fetchFriendSpots()]);
      setError("");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const handleUnfollow = async (username: string) => {
    try {
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/unfollow`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await Promise.all([fetchFollowers(), fetchFollowing(), fetchFriendSpots()]);
      setError("");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const fetchFriendSpots = async () => {
    try {
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/friend-spots`
      );
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Community</h1>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowFollowers(true)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {followers.length} follower{followers.length !== 1 ? 's' : ''}
                  </button>
                  <button 
                    onClick={() => setShowFollowing(true)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {following.length} following
                  </button>
                </div>
              </div>
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

      {/* Followers Modal */}
      <UsersModal
  isOpen={showFollowers}
  onClose={() => setShowFollowers(false)}
  title="Followers"
  users={followers.map(user => ({
    ...user,
    isFollowing: following.some(f => f.username === user.username)
  }))}
  onAction={async (username) => {
    const isFollowing = following.some(user => user.username === username);
    if (!isFollowing) {
      await handleFollow(username);
    }
  }}
  actionLabel={(user) => user.isFollowing ? "Following" : "Follow Back"}
/>

      {/* Following Modal */}
      <UsersModal
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        title="Following"
        users={following}
        onAction={handleUnfollow}
        actionLabel="Unfollow"
      />

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
              <h3 className="text-xl font-bold text-gray-900 mb-4">Follow User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
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
                    onClick={() => {
                      setShowAddFriend(false);
                      setFriendUsername("");
                      setError("");
                    }}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={async () => {
                      await handleFollow(friendUsername);
                      if (!error) {
                        setShowAddFriend(false);
                        setFriendUsername("");
                      }
                    }}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    Follow
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {friendSpots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No spots from people you follow yet.</p>
              <p className="text-sm text-gray-400 mt-2">Follow more users to see their spots here!</p>
            </div>
          ) : (
            friendSpots.map((spot) => (
              <div key={spot._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4">
                  <div className="flex items-start justify-between">
<div className="flex items-center gap-2">
  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
    <Users size={16} className="text-blue-500" />
  </div>
  <div>
    <p className="font-medium text-gray-900">@{spot.username}</p>
    <p className="text-sm text-gray-500">{formatDate(spot.timestamp)}</p>
  </div>
</div>
<p className="text-sm text-gray-500 flex items-center gap-1">
  <MapPin size={14} />
  {spot.userId?.location?.city 
    ? `${spot.userId.location.city}, ${spot.userId.location.country}`
    : (spot.country || 'Unknown Location')}
</p>
<div className="ml-10 mt-2">
  <p className="text-gray-900 mb-1">
    Spotted a {spot.flight?.type || 'Unknown Aircraft'}
  </p>
  <div className="flex items-center gap-2 text-sm text-gray-500">
    <span>{spot.flight?.departureAirport || 'N/A'}</span>
    <span>→</span>
    <span>{spot.flight?.arrivalAirport || 'N/A'}</span>
  </div>
</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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