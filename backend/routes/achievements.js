const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');
const mongoose = require('mongoose');

// Helper function to get next reset date
function getNextResetDate(type) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  if (type === 'daily') {
    return tomorrow;
  } else if (type === 'weekly') {
    // Get next Sunday
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
  }
}

// Initialize achievements for a user
async function initializeAchievements(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

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
      }
    ];

    user.achievements = defaultAchievements;
    await user.save();
  } catch (error) {
    console.error('Error initializing achievements:', error);
    throw error;
  }
}

// Get user's achievements
router.get('/:userId', async (req, res) => {
  try {
    let user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    // Initialize achievements if they don't exist
    if (!user.achievements || user.achievements.length === 0) {
      await initializeAchievements(req.params.userId);
      user = await User.findById(req.params.userId);
    }

    // Reset achievements if needed
    const now = new Date();
    let achievementsUpdated = false;

    for (let achievement of user.achievements) {
      if (now >= new Date(achievement.resetDate)) {
        achievement.progress = 0;
        achievement.completed = false;
        achievement.resetDate = getNextResetDate(achievement.type);
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

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Get start of current week (Sunday)
    const thisWeek = new Date(now);
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    thisWeek.setHours(0, 0, 0, 0);

    // Count today's spots
    const todaySpots = await Spot.countDocuments({
      userId: new mongoose.Types.ObjectId(user._id),
      timestamp: { $gte: today }
    });

    // Count Airbus spots using aggregation
    const spots = await Spot.find({
      userId: new mongoose.Types.ObjectId(user._id),
      timestamp: { $gte: thisWeek }
    });

    // Count Airbus planes (any type starting with 'A')
    const weeklyAirbusSpots = spots.filter(spot => 
      spot.flight && spot.flight.type && spot.flight.type.startsWith('A')
    ).length;

    console.log('Weekly Airbus spots found:', weeklyAirbusSpots); // Debug log

    // Update achievements
    let achievementsUpdated = false;
    user.achievements.forEach(achievement => {
      // Check if achievement needs reset
      if (now >= new Date(achievement.resetDate)) {
        achievement.progress = 0;
        achievement.completed = false;
        achievement.resetDate = getNextResetDate(achievement.type);
        achievementsUpdated = true;
      }

      if (achievement.name === 'Daily Spotter') {
        achievement.progress = todaySpots;
        if (todaySpots >= achievement.target && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = now;
          achievementsUpdated = true;
        }
      } else if (achievement.name === 'Airbus Expert') {
        achievement.progress = weeklyAirbusSpots;
        if (weeklyAirbusSpots >= achievement.target && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = now;
          achievementsUpdated = true;
        }
      }
    });

    if (achievementsUpdated) {
      await user.save();
    }

    res.json(user.achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;