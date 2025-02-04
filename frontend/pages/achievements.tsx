import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { Trophy, Medal, Calendar, Star, Home, BookOpen, Users } from "lucide-react";
import Link from "next/link";
import confetti from 'canvas-confetti';
import { motion } from "framer-motion";

type Achievement = {
  _id: string;
  type: 'daily' | 'weekly';
  name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: Date;
  resetDate: Date;
  completionHistory?: {
    completedAt: Date;
    xpEarned: number;
  }[];
};

interface AchievementCardProps {
  achievement: Achievement;
}


const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  useEffect(() => {
    if (achievement.completed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [achievement.completed]);

  const timeUntilReset = () => {
    const now = new Date();
    const resetDate = new Date(achievement.resetDate);
    const diff = resetDate.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d`;
    }
    
    if (hours < 1) {
      return `${minutes}m`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <motion.div 
      layout
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          achievement.type === 'daily' 
            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white' 
            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
        }`}>
          {achievement.type === 'daily' ? 'Daily' : 'Weekly'}
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Star size={14} />
          {timeUntilReset()}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${
          achievement.completed
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
            : achievement.type === 'daily'
            ? 'bg-gradient-to-r from-indigo-600 to-blue-600'
            : 'bg-gradient-to-r from-amber-500 to-orange-500'
        }`}>
          {achievement.completed ? (
            <Trophy className="text-white" size={24} />
          ) : achievement.type === 'daily' ? (
            <Calendar className="text-white" size={24} />
          ) : (
            <Medal className="text-white" size={24} />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{achievement.description}</p>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress
              </span>
              <span className="text-sm text-gray-500">
                {achievement.progress}/{achievement.target}
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%`
                }}
                className={`h-full transition-all duration-500 ${
                  achievement.completed 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                    : achievement.type === 'daily'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
              />
            </div>
            
            {achievement.completionHistory && achievement.completionHistory.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Completion History</h4>
                <div className="space-y-2">
                  {achievement.completionHistory.map((completion, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-500">
                        {new Date(completion.completedAt).toLocaleDateString()}
                      </span>
                      <span className="text-emerald-600 font-medium">
                        +{completion.xpEarned} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Achievements() {
  const { data: session } = useSession();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const fetchAchievements = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(
        `https://plane-spotter-backend.onrender.com/api/achievements/${session.user.id}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }
      
      const data = await response.json();
      setAchievements(data);
      
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Refresh on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAchievements();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAchievements]);

  // Regular polling
  useEffect(() => {
    const interval = setInterval(fetchAchievements, 30000);
    return () => clearInterval(interval);
  }, [fetchAchievements]);

  const filteredAchievements = achievements.filter(a => a.type === activeTab);
  const completedCount = achievements.filter(a => a.completed).length;
  const totalCount = achievements.length;

  if (!session) {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-blue-50 to-white flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="text-indigo-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">My Achievements</h1>
              <p className="text-gray-500 mb-6">Sign in to track your progress</p>
              <div className="space-y-3">
                <Link
                  href="/auth/signin"
                  className="block w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="block w-full py-3 px-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-medium"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Premium Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 pt-8 pb-6 px-4 fixed top-0 left-0 right-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md">
                <Trophy className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white">Achievements</h1>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
              <span className="text-white/90 text-sm">
                {completedCount} of {totalCount} completed
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="text-white w-4 h-4" />
                <span className="text-white/90 text-sm">Daily Achievement</span>
              </div>
              <span className="text-lg font-bold text-white">+20 XP</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-1">
                <Medal className="text-white w-4 h-4" />
                <span className="text-white/90 text-sm">Weekly Achievement</span>
              </div>
              <span className="text-lg font-bold text-white">+100 XP</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('daily')} 
              className={`flex-1 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === 'daily' 
                  ? 'bg-white text-indigo-600' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Daily
            </button>
            <button 
              onClick={() => setActiveTab('weekly')} 
              className={`flex-1 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === 'weekly' 
                  ? 'bg-white text-indigo-600' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 mt-[250px] mb-24 flex-1 overflow-y-auto">
        {isLoading && achievements.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin text-indigo-600">
              <Trophy size={32} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAchievements.map(achievement => (
              <AchievementCard key={achievement._id} achievement={achievement} />
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around py-4">
            <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <Home className="w-6 h-6" />
              </div>
              <span className="text-xs">Home</span>
            </Link>
            
            <Link href="/community" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs">Community</span>
            </Link>
            
            <Link href="/collections" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <div className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-50">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xs">Collection</span>
            </Link>
            
            <Link href="/achievements" className="flex flex-col items-center gap-1 text-indigo-600">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium">Achievements</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}