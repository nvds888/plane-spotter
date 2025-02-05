import React, { useState, useEffect, JSX } from 'react';
import { Award, Plane, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from "next-auth/react";

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

interface UserXP {
  totalXP: number;
  weeklyXP: number;
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

interface FollowingUser {
  _id: string;
  username: string;
  email: string;
}

const ProfileModal = ({ userId, isOpen, onClose }: ProfileModalProps): JSX.Element | null => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [userXP, setUserXP] = useState<UserXP>({ totalXP: 0, weeklyXP: 0 });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/badgesprofile/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserXP = async () => {
      if (!userId) return;
      try {
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/user/${userId}/xp`);
        if (!response.ok) throw new Error('Failed to fetch XP');
        const data = await response.json();
        setUserXP(data);
      } catch (error) {
        console.error('Error fetching XP:', error);
      }
    };

    if (isOpen && userId) {
      fetchProfile();
      fetchUserXP();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (profileData && session?.user?.id) {
      const checkFollowStatus = async () => {
        try {
          const response = await fetch(
            `https://plane-spotter-backend.onrender.com/api/user/${session.user.id}/following`
          );
          if (!response.ok) throw new Error('Failed to fetch following status');
          const following: FollowingUser[] = await response.json();
          setIsFollowing(following.some((followingUser: FollowingUser) => 
            followingUser.username === profileData.username
          ));
        } catch (error) {
          console.error('Error checking follow status:', error);
        }
      };
      checkFollowStatus();
    }
  }, [profileData, session?.user?.id]);

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
        return <Plane size={24} />;
      case 'Calendar':
        return <Calendar size={24} />;
      case 'Award':
        return <Award size={24} />;
      default:
        return <Award size={24} />;
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
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 truncate max-w-[250px]">
                      @{profileData.username} Profile
                    </h2>
                    <div className="flex gap-4 text-sm text-gray-500 mb-1 mt-2">
                      <span>{profileData.stats.followers} followers</span>
                      <span>{profileData.stats.following} following</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Member since {new Date(profileData.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {session?.user?.id !== userId && profileData && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `https://plane-spotter-backend.onrender.com/api/user/${session?.user?.id}/${isFollowing ? 'unfollow' : 'follow'}`,
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: profileData.username })
                              }
                            );
                            if (!response.ok) throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
                            setIsFollowing(!isFollowing);
                          } catch (error) {
                            console.error('Error following/unfollowing user:', error);
                          }
                        }}
                        className={`px-4 py-2 ${
                          isFollowing 
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        } rounded-xl transition-colors`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                    <button 
                      onClick={onClose}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <X size={20} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* XP Stats */}
                <div className="grid grid-cols-2 gap-3 mt-6 mb-3">
                  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                      <span className="text-white/90 text-sm">Weekly XP</span>
                    </div>
                    <span className="text-xl font-bold text-white">{userXP.weeklyXP}</span>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                      <span className="text-white/90 text-sm">Total XP</span>
                    </div>
                    <span className="text-xl font-bold text-white">{userXP.totalXP}</span>
                  </div>
                </div>

                {/* Compact Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-indigo-50 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Plane className="text-indigo-600" size={16} />
                      <div>
                        <p className="text-xs text-indigo-600">Total Spots</p>
                        <p className="text-lg font-bold text-indigo-700">
                          {profileData.stats.totalSpots}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-blue-600" size={16} />
                      <div>
                        <p className="text-xs text-blue-600">Current Streak</p>
                        <p className="text-lg font-bold text-blue-700">
                          {profileData.stats.currentStreak}d
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Badges</h3>
                <div className="overflow-y-auto max-h-48 pr-2">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {profileData.badges.map((badge: Badge) => (
                      <div 
                        key={badge.id} 
                        className={`aspect-square bg-gradient-to-r ${getRarityColor(badge.rarity)} rounded-xl p-4 flex flex-col items-center justify-center group cursor-pointer relative`}
                      >
                        <div className="text-white mb-1">
                          {getIcon(badge.icon)}
                        </div>
                        <div className="absolute inset-0 bg-black/80 text-white text-xs p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center">
                          <p className="font-medium">{badge.name}</p>
                          <p className="text-white/80 text-[10px] mt-1">{badge.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Two rows of placeholder badges */}
                  <div className="grid grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={`placeholder-${i}`} 
                        className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center"
                      >
                        <Award size={24} className="text-gray-300" />
                      </div>
                    ))}
                  </div>
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