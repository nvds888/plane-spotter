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
    description: 'Spot 2 planes today',
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
  }
];

// Get user's achievements with initialization if needed
router.get('/:userId', async (req, res) => {
  try {
    let user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    let achievementsNeedUpdate = false;

    // Initialize or update achievements
    if (!user.achievements || user.achievements.length === 0) {
      user.achievements = defaultAchievements;
      achievementsNeedUpdate = true;
    } else {
      // Add any missing achievements and check for resets
      defaultAchievements.forEach(defaultAchievement => {
        const existingAchievement = user.achievements.find(a => a.name === defaultAchievement.name);
        if (!existingAchievement) {
          user.achievements.push(defaultAchievement);
          achievementsNeedUpdate = true;
        } else if (now >= new Date(existingAchievement.resetDate)) {
          existingAchievement.progress = 0;
          existingAchievement.completed = false;
          existingAchievement.resetDate = getNextResetDate(existingAchievement.type);
          achievementsNeedUpdate = true;
        }
      });
    }

    if (achievementsNeedUpdate) {
      user.markModified('achievements');
      await user.save();
    }

    res.json(user.achievements);
  } catch (error) {
    console.error('Error in GET /:userId:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update achievements progress more efficiently
router.post('/:userId/update', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Use aggregation pipeline for more efficient counting
    const [dailyStats, weeklyStats] = await Promise.all([
      // Daily spots count
      Spot.countDocuments({
        userId: user._id,
        timestamp: { $gte: startOfToday }
      }),
      
      // Weekly aircraft type counts
      Spot.aggregate([
        {
          $match: {
            userId: user._id,
            timestamp: { $gte: startOfWeek },
            'flight.type': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            airbusCount: {
              $sum: {
                $cond: [
                  { $regexMatch: { 
                    input: '$flight.type', 
                    regex: '^A[0-9]' // This will match any Airbus code like A21N, A320, A359, etc.
                  }},
                  1,
                  0
                ]
              }
            },
            a321neoCount: {
              $sum: {
                $cond: [
                  { $eq: ['$flight.type', 'A21N'] }, // Exact match for A21N
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const weeklyTypeCounts = weeklyStats[0] || { airbusCount: 0, a321neoCount: 0 };
    let achievementsUpdated = false;

    for (let achievement of user.achievements) {
      // Check for reset
      if (now >= new Date(achievement.resetDate)) {
        achievement.progress = 0;
        achievement.completed = false;
        achievement.resetDate = getNextResetDate(achievement.type);
        achievementsUpdated = true;
      }

      // Update progress based on achievement type
      switch (achievement.name) {
        case 'Daily Spotter':
          achievement.progress = dailyStats;
          if (dailyStats >= achievement.target && !achievement.completed) {
            achievement.completed = true;
            achievement.completedAt = now;
            achievementsUpdated = true;
          }
          break;
        case 'Airbus Expert':
          achievement.progress = weeklyTypeCounts.airbusCount;
          if (weeklyTypeCounts.airbusCount >= achievement.target && !achievement.completed) {
            achievement.completed = true;
            achievement.completedAt = now;
            achievementsUpdated = true;
          }
          break;
        case 'A321neo Hunter':
          achievement.progress = weeklyTypeCounts.a321neoCount;
          if (weeklyTypeCounts.a321neoCount >= achievement.target && !achievement.completed) {
            achievement.completed = true;
            achievement.completedAt = now;
            achievementsUpdated = true;
          }
          break;
      }
    }

    if (achievementsUpdated) {
      user.markModified('achievements');
      await user.save();
    }

    res.json(user.achievements);
  } catch (error) {
    console.error('Error in POST /:userId/update:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;