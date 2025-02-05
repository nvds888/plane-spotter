const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');
const mongoose = require('mongoose');

// Helper function to get next reset date in UTC
function getNextResetDate(type) {
  const now = new Date();
  
  if (type === 'daily') {
    const nextDay = new Date(now);
    nextDay.setUTCHours(24, 0, 0, 0);
    return nextDay;
  } else if (type === 'weekly') {
    const currentDay = now.getUTCDay();
    const daysUntilMonday = currentDay === 0 ? 1 : 1 + 7 - currentDay;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);
    return nextMonday;
  }
}

const defaultAchievements = [
  {
    type: 'daily',
    name: 'Daily Spotter',
    description: 'Spot 2 planes today to earn bonus XP',
    target: 2,
    progress: 0,
    completed: false,
    resetDate: getNextResetDate('daily')
  },
  {
    type: 'weekly',
    name: 'Airbus Expert',
    description: 'Spot 10 Airbus planes this week',
    target: 10,
    progress: 0,
    completed: false,
    resetDate: getNextResetDate('weekly')
  },
  {
    type: 'weekly',
    name: 'A321neo Hunter',
    description: 'Spot 3 Airbus A321neo aircraft this week',
    target: 3,
    progress: 0,
    completed: false,
    resetDate: getNextResetDate('weekly')
  },
  {
    type: 'weekly',
    name: 'Boeing Expert',
    description: 'Spot 10 Boeing planes this week',
    target: 10,
    progress: 0,
    completed: false,
    resetDate: getNextResetDate('weekly')
  },
];

// Get user's achievements with initialization if needed

router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setUTCHours(0, 0, 0, 0);

    // Fetch all spots for the user
    const spots = await Spot.find({ userId });

    // Calculate daily and weekly stats
    const dailyStats = spots.filter(spot => 
      new Date(spot.timestamp) >= startOfToday
    ).length;

    const weeklyStats = spots.filter(spot => 
      new Date(spot.timestamp) >= startOfWeek
    );

    const boeingCount = weeklyStats.filter(spot =>
      /^B\d+/.test(spot.flight?.type)
    ).length;

    const airbusCount = weeklyStats.filter(spot => 
      /^A\d+/.test(spot.flight?.type)
    ).length;

    const a321neoCount = weeklyStats.filter(spot => 
      spot.flight?.type === 'A21N'
    ).length;

    // Initialize or update achievements
    if (!user.achievements || user.achievements.length === 0) {
      user.achievements = defaultAchievements;
    }

    let achievementsUpdated = false;
    let bonusXPAwarded = 0;

    // Update achievements based on calculated stats
    for (let achievement of user.achievements) {
      if (now >= new Date(achievement.resetDate)) {
        // Before resetting, check if achievement was completed
        if (achievement.completed) {
          const xpEarned = achievement.type === 'daily' ? 20 : 100;
          
          // Log the completed achievement in history with explicit XP
          achievement.completionHistory.push({
            completedAt: achievement.completedAt || now,
            xpEarned: xpEarned
          });
        }
    
        achievement.progress = 0;
        achievement.completed = false;
        achievement.resetDate = getNextResetDate(achievement.type);
        achievementsUpdated = true;
      }

      const oldProgress = achievement.progress;
      const wasCompleted = achievement.completed;

      switch (achievement.name) {
        case 'Daily Spotter':
          achievement.progress = dailyStats;
          if (achievement.progress !== oldProgress) {
            achievementsUpdated = true;
          }
          if (dailyStats >= achievement.target && !wasCompleted) {
            achievement.completed = true;
            achievement.completedAt = now;
            bonusXPAwarded += 20; // Bonus XP for daily achievement
            achievementsUpdated = true;
          }
          break;
        case 'Airbus Expert':
          achievement.progress = airbusCount;
          if (achievement.progress !== oldProgress) {
            achievementsUpdated = true;
          }
          if (airbusCount >= achievement.target && !wasCompleted) {
            achievement.completed = true;
            achievement.completedAt = now;
            bonusXPAwarded += 100; // Bonus XP for weekly achievement
            achievementsUpdated = true;
          }
          break;
        case 'A321neo Hunter':
          achievement.progress = a321neoCount;
          if (achievement.progress !== oldProgress) {
            achievementsUpdated = true;
          }
          if (a321neoCount >= achievement.target && !wasCompleted) {
            achievement.completed = true;
            achievement.completedAt = now;
            bonusXPAwarded += 100; // Bonus XP for weekly achievement
            achievementsUpdated = true;
          }
          break;
          case 'Boeing Expert':
          achievement.progress = boeingCount;
          if (achievement.progress !== oldProgress) {
            achievementsUpdated = true;
          }
          if (airbusCount >= achievement.target && !wasCompleted) {
            achievement.completed = true;
            achievement.completedAt = now;
            bonusXPAwarded += 100; // Bonus XP for weekly achievement
            achievementsUpdated = true;
          }
          break;
      }
    }

    if (achievementsUpdated) {
      user.markModified('achievements');
      
      // Award bonus XP if any achievements were newly completed
      if (bonusXPAwarded > 0) {
        await User.findByIdAndUpdate(
          userId,
          { 
            $inc: { 
              totalXP: bonusXPAwarded, 
              weeklyXP: bonusXPAwarded 
            } 
          }
        );
      }

      await user.save();
    }

    res.json(user.achievements);
  } catch (error) {
    console.error('Error in GET /:userId:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;