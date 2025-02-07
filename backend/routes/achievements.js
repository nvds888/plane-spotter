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
    type: 'daily',
    name: 'Airline Collector',
    description: 'Spot aircraft from 4 different airlines today',
    target: 4,
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

    const uniqueDailyAirlines = new Set(
      spots
        .filter(spot => new Date(spot.timestamp) >= startOfToday)
        .map(spot => {
          // Check operating_as first, then painted_as
          if (spot.flight?.operating_as) return spot.flight.operating_as;
          if (spot.flight?.painted_as) return spot.flight.painted_as;
          // If neither exists, try to extract airline from flight number
          if (spot.flight?.flight) {
            // Most flight numbers start with airline code (2-3 letters)
            const airlineCode = spot.flight.flight.match(/^[A-Z]{2,3}/)?.[0];
            return airlineCode;
          }
          return null;
        })
        .filter(Boolean) // Remove null/undefined values
    ).size;

    // Initialize or update achievements
    if (!user.achievements || user.achievements.length === 0) {
      user.achievements = defaultAchievements;
    }

    let achievementsUpdated = false;
    let bonusXPAwarded = 0;

    // Update achievements based on calculated stats
    for (let achievement of user.achievements) {
      if (now >= new Date(achievement.resetDate)) {
        if (achievement.completed) {
          const xpEarned = achievement.type === 'daily' ? 20 : 100;
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
            bonusXPAwarded += 20;
            achievementsUpdated = true;
          }
          break;
        case 'Airline Collector':
          achievement.progress = uniqueDailyAirlines;
          if (achievement.progress !== oldProgress) {
            achievementsUpdated = true;
          }
          if (uniqueDailyAirlines >= achievement.target && !wasCompleted) {
            achievement.completed = true;
            achievement.completedAt = now;
            bonusXPAwarded += 20;
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
            bonusXPAwarded += 100;
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
            bonusXPAwarded += 100;
            achievementsUpdated = true;
          }
          break;
        case 'Boeing Expert':
          achievement.progress = boeingCount;
          if (achievement.progress !== oldProgress) {
            achievementsUpdated = true;
          }
          if (boeingCount >= achievement.target && !wasCompleted) {
            achievement.completed = true;
            achievement.completedAt = now;
            bonusXPAwarded += 100;
            achievementsUpdated = true;
          }
          break;
      }
    }

    if (achievementsUpdated) {
      user.markModified('achievements');
      
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