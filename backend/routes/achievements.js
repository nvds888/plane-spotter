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
    nextDay.setUTCHours(24, 0, 0, 0); // Next day UTC midnight
    return nextDay;
  } else if (type === 'weekly') {
    // Calculate next Monday UTC
    const currentDay = now.getUTCDay(); // 0 (Sun) to 6 (Sat)
    const daysUntilMonday = currentDay === 0 ? 1 : 1 + 7 - currentDay;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);
    return nextMonday;
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
    console.log(`Fetching achievements for user ${req.params.userId}`); // Debug log
    let user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    // Initialize achievements if they don't exist
    if (!user.achievements || user.achievements.length === 0) {
      console.log('Initializing achievements for user'); // Debug log
      await initializeAchievements(req.params.userId);
      user = await User.findById(req.params.userId);
    }

    // Reset achievements if needed
    const now = new Date();
    let achievementsUpdated = false;

    for (let achievement of user.achievements) {
      if (now >= new Date(achievement.resetDate)) {
        console.log(`Resetting achievement ${achievement.name}`); // Debug log
        achievement.progress = 0;
        achievement.completed = false;
        achievement.resetDate = getNextResetDate(achievement.type);
        achievementsUpdated = true;
      }
    }

    if (achievementsUpdated) {
      console.log('Saving updated achievements'); // Debug log
      await user.save();
    }

    res.json(user.achievements);
  } catch (error) {
    console.error('Error in GET /:userId:', error); // Debug log
    res.status(500).json({ error: error.message });
  }
});

// Update achievements progress
router.post('/:userId/update', async (req, res) => {
  try {
    console.log(`Updating achievements for user ${req.params.userId}`); // Debug log
    const user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    
    // Daily reset time (UTC)
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    
    // Weekly reset time (Monday UTC)
    const thisWeek = new Date(now);
    thisWeek.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7)); // Previous Monday
    thisWeek.setUTCHours(0, 0, 0, 0);

    // Count today's spots (UTC)
    const todaySpots = await Spot.countDocuments({
      userId: new mongoose.Types.ObjectId(user._id),
      timestamp: { $gte: today }
    });

    console.log(`Today's spots: ${todaySpots}`); // Debug log

    // Count weekly Airbus spots using aggregation (optimized)
    const weeklyAirbusSpots = await Spot.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(user._id),
          timestamp: { $gte: thisWeek },
          'flight.type': { $regex: /^A/ } // Regex to match types starting with 'A'
        }
      },
      { $count: 'count' }
    ]);

    const airbusCount = weeklyAirbusSpots[0]?.count || 0;
    console.log(`Weekly Airbus spots: ${airbusCount}`); // Debug log

    // Update achievements
    let achievementsUpdated = false;
    user.achievements.forEach(achievement => {
      if (new Date() >= new Date(achievement.resetDate)) {
        console.log(`Resetting achievement ${achievement.name}`); // Debug log
        achievement.progress = 0;
        achievement.completed = false;
        achievement.resetDate = getNextResetDate(achievement.type);
        achievementsUpdated = true;
      }

      if (achievement.name === 'Daily Spotter') {
        achievement.progress = todaySpots;
        if (todaySpots >= achievement.target && !achievement.completed) {
          console.log(`Completing Daily Spotter achievement`); // Debug log
          achievement.completed = true;
          achievement.completedAt = now;
          achievementsUpdated = true;
        }
      } else if (achievement.name === 'Airbus Expert') {
        achievement.progress = airbusCount;
        if (airbusCount >= achievement.target && !achievement.completed) {
          console.log(`Completing Airbus Expert achievement`); // Debug log
          achievement.completed = true;
          achievement.completedAt = now;
          achievementsUpdated = true;
        }
      }
    });

    if (achievementsUpdated) {
      console.log('Saving updated achievements'); // Debug log
      await user.save();
    }

    res.json(user.achievements);
  } catch (error) {
    console.error('Error in POST /:userId/update:', error); // Debug log
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;