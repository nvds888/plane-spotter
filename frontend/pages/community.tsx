import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, MapPin, Plane, House, BookOpen, Trophy, X, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import ProfileModal from "../components/ProfileModal";  

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
  city?: string
  country?: string
  flight?: Flight
  guessedType?: string
  guessedAirline?: string
  guessedDestination?: string
  isTypeCorrect?: boolean
  isAirlineCorrect?: boolean
  isDestinationCorrect?: boolean
  baseXP?: number
  bonusXP?: number
}

interface User {
  _id: string;
  username: string;
  email: string;
}

interface UserWithFollowing extends User {
  isFollowing?: boolean;
}

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: UserWithFollowing[];
  onAction?: (username: string) => Promise<void>;
  actionLabel?: string | ((user: UserWithFollowing) => string);
}
interface SpotCardProps {
  spot: Spot;
  onProfileClick: (userId: string) => void;
}

const SpotCard = ({ spot, onProfileClick }: SpotCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const totalXP = (spot.baseXP || 0) + (spot.bonusXP || 0);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Users size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p 
                className="font-medium text-gray-900 hover:text-indigo-600 cursor-pointer"
                onClick={() => onProfileClick(spot.userId._id)}
              >
                @{spot.username}
              </p>
              {totalXP > 0 && (
                <span className="text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1 rounded-full">
                  +{totalXP} XP
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{formatDate(spot.timestamp)}</p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <p className="text-gray-900 font-medium">{spot.flight?.type || 'Unknown Aircraft'}</p>
              <p className="text-sm text-gray-600">{spot.flight?.operator || 'Unknown Operator'}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span>{spot.flight?.departureAirport || 'N/A'}</span>
                <span>→</span>
                <span>{spot.flight?.arrivalAirport || 'N/A'}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1 ml-4">
              <MapPin size={14} />
              {spot.userId?.location?.city 
                ? `${spot.userId.location.city}, ${spot.userId.location.country}`
                : (spot.country || 'Unknown Location')}
            </p>
          </div>

          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="flex justify-center w-full"
          >
            <ChevronDown className="text-gray-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Altitude</p>
                    <p className="font-medium">
                      {spot.flight?.alt ? `${spot.flight.alt.toLocaleString()} ft` : "N/A"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Speed</p>
                    <p className="font-medium">
                      {spot.flight?.speed ? `${spot.flight.speed} kts` : "N/A"}
                    </p>
                  </div>
                </div>

                {(spot.isTypeCorrect !== undefined || 
                  spot.isAirlineCorrect !== undefined || 
                  spot.isDestinationCorrect !== undefined) && (
                  <div className="flex flex-wrap gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                      ${spot.isTypeCorrect ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                      {spot.isTypeCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      <span className="font-medium">Type</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                      ${spot.isAirlineCorrect ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                      {spot.isAirlineCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      <span className="font-medium">Airline</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                      ${spot.isDestinationCorrect ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                      {spot.isDestinationCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      <span className="font-medium">Destination</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const UsersModal = ({
  isOpen,
  onClose,
  title,
  users,
  onAction,
  actionLabel
}: UsersModalProps) => (
  <AnimatePresence>
    {isOpen && (
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
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl">
                <Users className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {users.length === 0 ? (
              <div className="text-center py-8 bg-white/50 rounded-2xl">
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="bg-white/50 backdrop-blur-sm rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
                          <Users size={20} className="text-white" />
                        </div>
                        <p className="font-medium text-gray-900">@{user.username}</p>
                      </div>
                      {onAction && actionLabel && (
                        <button
                          onClick={() => !user.isFollowing && onAction(user.username)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                            ${user.isFollowing 
                              ? 'bg-gray-100 text-gray-400' 
                              : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700'
                            }`}
                        >
                          {typeof actionLabel === 'function' ? actionLabel(user) : actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

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

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriend && (
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
                  <UserPlus className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Find User</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter username"
                  />
                </div>
                {error && (
                  <div className="bg-rose-50 text-rose-500 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAddFriend(false);
                      setFriendUsername("");
                      setError("");
                    }}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `https://plane-spotter-backend.onrender.com/api/user/find/${friendUsername}`
                        );
                        if (!response.ok) {
                          throw new Error('User not found');
                        }
                        const userData = await response.json();
                        setSelectedUserId(userData._id);
                        setShowAddFriend(false);
                        setShowProfileModal(true);
                        setFriendUsername("");
                        setError("");
                      } catch (error) {
                        setError(error instanceof Error ? error.message : 'Failed to find user');
                      }
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-colors font-medium"
                    whileTap={{ scale: 0.95 }}
                  >
                    View Profile
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
      <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2">
          <Plane className="text-indigo-600" size={16} />
          <span className="text-sm">
            {globalSpot.flight?.type} spotted in {globalSpot.city}, {globalSpot.country}
          </span>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Modals */}
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

      <UsersModal
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        title="Following"
        users={following}
        onAction={handleUnfollow}
        actionLabel="Unfollow"
      />

      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId || ''}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 pt-8 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Community</h1>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowFollowers(true)}
                  className="text-white/90 text-sm hover:text-white"
                >
                  {followers.length} follower{followers.length !== 1 ? 's' : ''}
                </button>
                <button 
                  onClick={() => setShowFollowing(true)}
                  className="text-white/90 text-sm hover:text-white"
                >
                  {following.length} following
                </button>
              </div>
            </div>
            <motion.button
              onClick={() => setShowAddFriend(true)}
              className="bg-white/10 p-3 rounded-2xl backdrop-blur-md hover:bg-white/20 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <UserPlus className="text-white" size={24} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Friend Spots Feed */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="space-y-4">
          {friendSpots.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center">
              <Users size={40} className="text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No spots from people you follow yet.</p>
              <p className="text-sm text-gray-500 mt-2">Follow more users to see their spots here!</p>
            </div>
          ) : (
            friendSpots.map((spot) => (
              <SpotCard 
                key={spot._id} 
                spot={spot}
                onProfileClick={(userId) => {
                  setSelectedUserId(userId);
                  setShowProfileModal(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around py-4">
            <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
              <House size="24" /> 
              </div>
              <span className="text-xs">Home</span>
            </Link>
            
            <Link href="/community" className="flex flex-col items-center gap-1 text-indigo-600">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium">Community</span>
            </Link>
            
            <Link href="/collections" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xs">Collection</span>
            </Link>
            
            <Link href="/achievements" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-xs">Achievements</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}