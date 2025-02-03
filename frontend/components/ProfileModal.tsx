import React, { useState, useEffect, JSX } from 'react';
import { Award, Plane, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'Plane' | 'Calendar' | 'Award';
  rarity: 'legendary' | 'epic' | 'rare' | 'common';
  earnedAt: string;
}

interface ProfileStats {
  totalSpots: number;
  currentStreak: number;
  longestStreak: number;
  followers: number;
  following: number;
}

interface ProfileData {
  username: string;
  joinDate: string;
  stats: ProfileStats;
  badges: Badge[];
}

interface ProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal = ({ userId, isOpen, onClose }: ProfileModalProps): JSX.Element | null => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/badgesAndProfile/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && userId) {
      fetchProfile();
    }
  }, [isOpen, userId]);

  const getRarityColor = (rarity: Badge['rarity']): string => {
    switch (rarity) {
      case 'legendary':
        return 'from-amber-500 to-yellow-500';
      case 'epic':
        return 'from-purple-500 to-pink-500';
      case 'rare':
        return 'from-blue-500 to-indigo-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getIcon = (iconName: Badge['icon']): JSX.Element => {
    switch (iconName) {
      case 'Plane':
        return <Plane size={20} />;
      case 'Calendar':
        return <Calendar size={20} />;
      case 'Award':
        return <Award size={20} />;
      default:
        return <Award size={20} />;
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
          className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : profileData ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
                    <p className="text-sm text-gray-500">
                      Member since {new Date(profileData.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                {/* User Stats */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Plane className="text-indigo-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-indigo-600">Total Spots</p>
                        <p className="text-xl font-bold text-indigo-700">
                          {profileData.stats.totalSpots}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Current Streak</p>
                        <p className="text-xl font-bold text-blue-700">
                          {profileData.stats.currentStreak} days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <button className="text-sm text-gray-500">
                    {profileData.stats.followers} followers
                  </button>
                  <button className="text-sm text-gray-500">
                    {profileData.stats.following} following
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Badges</h3>
                <div className="space-y-4">
                  {profileData.badges.map((badge: Badge) => (
                    <div key={badge.id} className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${getRarityColor(badge.rarity)}`}>
                        <div className="text-white">
                          {getIcon(badge.icon)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{badge.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full capitalize
                            ${badge.rarity === 'legendary' ? 'bg-amber-100 text-amber-700' :
                              badge.rarity === 'epic' ? 'bg-purple-100 text-purple-700' :
                              'bg-blue-100 text-blue-700'}`}>
                            {badge.rarity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Earned {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center">Error loading profile data</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileModal;