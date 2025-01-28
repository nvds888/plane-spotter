// routes/achievements.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');
const mongoose = require('mongoose');

// Initialize achievements for a user
async function initializeAchievements(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);

  const defaultAchievements = [
    {
      type: 'daily',
      name: 'Daily Spotter',
      description: 'Spot 2 planes in a day',
      target: 2,
      progress: 0,
      completed: false,
      resetDate: tomorrow
    },
    {
      type: 'weekly',
      name: 'Airbus Expert',
      description: 'Spot 10 Airbus planes this week',
      target: 10,
      progress: 0,
      completed: false,
      resetDate: nextWeek
    }
  ];

  user.achievements = defaultAchievements;
  return user.save();
}

// Get user's achievements
router.get('/:userId', async (req, res) => {
  try {
    let user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    // Initialize achievements if they don't exist
    if (!user.achievements || user.achievements.length === 0) {
      user = await initializeAchievements(req.params.userId);
    }

    // Reset achievements if needed
    const now = new Date();
    let achievementsUpdated = false;

    for (let achievement of user.achievements) {
      if (now >= achievement.resetDate) {
        achievement.progress = 0;
        achievement.completed = false;
        
        // Set next reset date
        const nextReset = new Date();
        if (achievement.type === 'daily') {
          nextReset.setDate(nextReset.getDate() + 1);
        } else if (achievement.type === 'weekly') {
          nextReset.setDate(nextReset.getDate() + 7);
        }
        nextReset.setHours(0, 0, 0, 0);
        achievement.resetDate = nextReset;
        
        achievementsUpdated = true;
      }
    }

    if (achievementsUpdated) {
      await user.save();
    }

    res.json(user.achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update achievements progress
router.post('/:userId/update', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    thisWeek.setHours(0, 0, 0, 0);

    // Count today's spots
    const todaySpots = await Spot.countDocuments({
      userId: user._id,
      timestamp: { $gte: today }
    });

    // Count this week's Airbus spots
    const weeklyAirbusSpots = await Spot.countDocuments({
      userId: user._id,
      timestamp: { $gte: thisWeek },
      'flight.type': { $regex: /^A/ } // Matches Airbus types starting with 'A'
    });

    // Update achievements
    user.achievements.forEach(achievement => {
      if (achievement.name === 'Daily Spotter') {
        achievement.progress = todaySpots;
        if (todaySpots >= achievement.target && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = new Date();
        }
      } else if (achievement.name === 'Airbus Expert') {
        achievement.progress = weeklyAirbusSpots;
        if (weeklyAirbusSpots >= achievement.target && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = new Date();
        }
      }
    });

    await user.save();
    res.json(user.achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;