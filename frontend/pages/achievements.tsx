import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Trophy, Medal, Calendar, Clock, Home, Layers } from "lucide-react";
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
      return `${days} day${days !== 1 ? 's' : ''} left`;
    }
    
    if (hours < 1) {
      return `${minutes} min left`;
    }
    
    return `${hours}h ${minutes}m left`;
  };
  
  return (
    <motion.div 
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${
          achievement.type === 'daily' 
            ? 'bg-violet-50 text-violet-500' 
            : 'bg-amber-50 text-amber-500'
        }`}>
          {achievement.type === 'daily' ? (
            <Calendar size={24} />
          ) : (
            <Trophy size={24} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 truncate">{achievement.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
          
          <div className="mt-3 flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            <span className="text-sm text-gray-500">{timeUntilReset()}</span>
          </div>
        </div>
        {achievement.completed ? (
          <div className="bg-emerald-50 p-3 rounded-xl">
            <Medal className="text-emerald-500" size={24} />
          </div>
        ) : (
          <div className="text-lg font-semibold text-right text-gray-900">
            {achievement.progress}/{achievement.target}
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${achievement.completed ? 'bg-emerald-500' : 'bg-violet-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default function Achievements() {
  const { data: session } = useSession();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!session?.user?.id) return;
      
      try {
        console.log('Updating achievements...'); // Debug log
        // First update the achievements
        await fetch(`https://plane-spotter-backend.onrender.com/api/achievements/${session.user.id}/update`, {
          method: 'POST'
        });
        
        console.log('Fetching achievements...'); // Debug log
        // Then fetch the latest state
        const response = await fetch(`https://plane-spotter-backend.onrender.com/api/achievements/${session.user.id}`);
        if (!response.ok) throw new Error('Failed to fetch achievements');
        
        const data = await response.json();
        console.log('Achievements fetched:', data); // Debug log
        setAchievements(data);
      } catch (error) {
        console.error('Failed to fetch achievements:', error); // Debug log
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchAchievements();
  
    // Set up an interval to refresh the achievements every minute
    const interval = setInterval(fetchAchievements, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const dailyAchievements = achievements.filter(a => a.type === 'daily');
  const weeklyAchievements = achievements.filter(a => a.type === 'weekly');

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to view your achievements</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8 mb-24">
        {/* Daily Achievements */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-violet-500" />
            Daily Achievements
          </h2>
          <div className="space-y-4">
            {dailyAchievements.map(achievement => (
              <AchievementCard key={achievement._id} achievement={achievement} />
            ))}
          </div>
        </section>

        {/* Weekly Achievements */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            Weekly Achievements
          </h2>
          <div className="space-y-4">
            {weeklyAchievements.map(achievement => (
              <AchievementCard key={achievement._id} achievement={achievement} />
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
        <div className="flex justify-around py-3 max-w-lg mx-auto">
          <Link href="/" className="p-2 text-gray-400 hover:text-gray-600 flex flex-col items-center transition-colors">
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/collections" className="p-2 text-gray-400 hover:text-gray-600 flex flex-col items-center transition-colors">
            <Layers size={24} />
            <span className="text-xs mt-1">Collection</span>
          </Link>
          <Link href="/achievements" className="p-2 text-violet-500 flex flex-col items-center">
            <Trophy size={24} />
            <span className="text-xs mt-1">Achievements</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}