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
      className="bg-white p-4 rounded-xl shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${achievement.type === 'daily' ? 'bg-blue-100' : 'bg-yellow-100'}`}>
          {achievement.type === 'daily' ? (
            <Calendar className="text-blue-500" size={24} />
          ) : (
            <Trophy className="text-yellow-500" size={24} />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{achievement.name}</h3>
          <p className="text-sm text-gray-600">{achievement.description}</p>
          
          <div className="mt-3 flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            <span className="text-sm text-gray-500">{timeUntilReset()}</span>
          </div>
        </div>
        {achievement.completed ? (
          <div className="bg-green-100 p-2 rounded-lg">
            <Medal className="text-green-500" size={24} />
          </div>
        ) : (
          <div className="text-lg font-semibold text-right">
            {achievement.progress}/{achievement.target}
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${achievement.completed ? 'bg-green-500' : 'bg-blue-500'}`}
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
        // First update the achievements
        await fetch(`https://plane-spotter-backend.onrender.com/api/achievements/${session.user.id}/update`, {
          method: 'POST'
        });
        
        // Then fetch the latest state
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-blue-500">🌀</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* iOS-style status bar */}
      <div className="h-6 bg-blue-500" />
      
      {/* Header */}
      <header className="bg-blue-500 text-white shadow-sm">
        <div className="max-w-2xl mx-auto p-4">
          <h1 className="text-2xl font-bold">🏆 Achievements</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Daily Achievements */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Calendar size={20} />
            Daily Achievements
          </h2>
          <div className="space-y-3">
            {dailyAchievements.map(achievement => (
              <AchievementCard key={achievement._id} achievement={achievement} />
            ))}
          </div>
        </section>

        {/* Weekly Achievements */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Trophy size={20} />
            Weekly Achievements
          </h2>
          <div className="space-y-3">
            {weeklyAchievements.map(achievement => (
              <AchievementCard key={achievement._id} achievement={achievement} />
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg safe-area-bottom">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          <Link href="/" className="p-2 text-gray-500 flex flex-col items-center">
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/collections" className="p-2 text-gray-500 flex flex-col items-center">
            <Layers size={24} />
            <span className="text-xs mt-1">Collection</span>
          </Link>
          <Link href="/achievements" className="p-2 text-blue-500 flex flex-col items-center">
            <Trophy size={24} />
            <span className="text-xs mt-1">Achievements</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}