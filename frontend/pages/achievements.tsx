import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Trophy, Medal, Calendar } from "lucide-react";

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
  const progress = Math.min((achievement.progress / achievement.target) * 100, 100);
  
  return (
    <motion.div 
      className="bg-white p-4 rounded-xl shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-2">
        {achievement.type === 'daily' ? (
          <Calendar className="text-blue-500" size={24} />
        ) : (
          <Trophy className="text-yellow-500" size={24} />
        )}
        <div>
          <h3 className="font-semibold text-lg">{achievement.name}</h3>
          <p className="text-sm text-gray-600">{achievement.description}</p>
        </div>
        {achievement.completed && (
          <Medal className="ml-auto text-green-500" size={24} />
        )}
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span>{achievement.progress} / {achievement.target}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
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
    <div className="min-h-screen bg-gray-50">
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
    </div>
  );
}