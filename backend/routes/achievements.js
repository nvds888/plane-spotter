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

module.exports = router;