import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Trophy, Medal, Calendar, Star, Home, BookOpen, Users } from "lucide-react";
import Link from "next/link";
import confetti from 'canvas-confetti';

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
};

const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
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
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className={`px-3 py-1 rounded-full text-sm ${
          achievement.type === 'daily' 
            ? 'bg-blue-50 text-blue-600' 
            : 'bg-amber-50 text-amber-600'
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
            ? 'bg-green-50'
            : achievement.type === 'daily'
            ? 'bg-blue-50'
            : 'bg-amber-50'
        }`}>
          {achievement.completed ? (
            <Trophy className="text-green-500" size={24} />
          ) : achievement.type === 'daily' ? (
            <Calendar className="text-blue-500" size={24} />
          ) : (
            <Medal className="text-amber-500" size={24} />
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
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  achievement.completed 
                    ? 'bg-green-500' 
                    : achievement.type === 'daily'
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ 
                  width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Achievements() {
  const { data: session } = useSession();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!session?.user?.id) return;
      
      try {
        await fetch(`https://plane-spotter-backend.onrender.com/api/achievements/${session.user.id}/update`, {
          method: 'POST'
        });
        
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/achievements/${session.user.id}`);
        if (!response.ok) throw new Error('Failed to fetch achievements');
        
        const data = await response.json();
        setAchievements(data);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAchievements();
    const interval = setInterval(fetchAchievements, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const filteredAchievements = achievements.filter(a => a.type === activeTab);
  const completedCount = achievements.filter(a => a.completed).length;
  const totalCount = achievements.length;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <Trophy className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-500">Please sign in to view your achievements</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin text-blue-500">
          <Trophy size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white pb-6 shadow-sm">
        <div className="max-w-lg mx-auto px-4">
          <div className="pt-12 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
            <p className="text-gray-500 mt-1">
              {completedCount} of {totalCount} completed
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'daily'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'weekly'
                  ? 'bg-amber-50 text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* Achievement Cards */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="space-y-4">
          {filteredAchievements.map(achievement => (
            <AchievementCard key={achievement._id} achievement={achievement} />
          ))}
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
              <Home size={24} />
              <span className="text-xs mt-1">Home</span>
            </Link>
            <Link 
              href="/community" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <Users size={24} />
              <span className="text-xs mt-1">Community</span>
            </Link>
            <Link 
              href="/collection" 
              className="flex flex-col items-center text-gray-500 hover:text-gray-700"
            >
              <BookOpen size={24} />
              <span className="text-xs mt-1">Collection</span>
            </Link>
            <Link 
              href="/achievements" 
              className="flex flex-col items-center text-blue-600"
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