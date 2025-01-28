import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Calendar, Clock, Home, Layers } from 'lucide-react';

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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200">
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
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              achievement.completed ? 'bg-emerald-500' : 'bg-violet-500'
            }`}
            style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch('https://plane-spotter-backend.onrender.com/api/achievements/${userId}');
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
  }, []);

  const dailyAchievements = achievements.filter(a => a.type === 'daily');
  const weeklyAchievements = achievements.filter(a => a.type === 'weekly');

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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around py-3 max-w-lg mx-auto">
          <button className="p-2 text-gray-400 hover:text-gray-600 flex flex-col items-center transition-colors">
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 flex flex-col items-center transition-colors">
            <Layers size={24} />
            <span className="text-xs mt-1">Collection</span>
          </button>
          <button className="p-2 text-violet-500 flex flex-col items-center">
            <Trophy size={24} />
            <span className="text-xs mt-1">Achievements</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AchievementsPage;