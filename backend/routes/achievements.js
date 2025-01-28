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
    } else {
      // Check for missing achievements and add them
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

      // Add any missing achievements
      let achievementsUpdated = false;
      defaultAchievements.forEach(defaultAchievement => {
        if (!user.achievements.find(a => a.name === defaultAchievement.name)) {
          console.log(`Adding missing achievement: ${defaultAchievement.name}`);
          user.achievements.push(defaultAchievement);
          achievementsUpdated = true;
        }
      });

      if (achievementsUpdated) {
        user.markModified('achievements');
        await user.save();
      }
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
    console.error('Error in GET /:userId:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update achievements progress
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

    // Get all spots for today and this week
    const todaySpots = await Spot.find({
      userId: new mongoose.Types.ObjectId(user._id),
      timestamp: { $gte: startOfToday }
    }).lean();

    const weeklySpots = await Spot.find({
      userId: new mongoose.Types.ObjectId(user._id),
      timestamp: { $gte: startOfWeek }
    }).lean();

    // Count today's spots
    const todayCount = todaySpots.length;
    console.log('Today spots count:', todayCount);

    // Count different types of aircraft
    const airbusCount = weeklySpots.filter(spot => 
      spot.flight?.type && 
      /^a/i.test(spot.flight.type)
    ).length;
    
    const a321neoCount = weeklySpots.filter(spot => 
      spot.flight?.type && 
      /^a21n$/i.test(spot.flight.type)
    ).length;
    
    console.log('Airbus spots count:', airbusCount);
    console.log('A321neo spots count:', a321neoCount);

    // Update achievements
    let achievementsUpdated = false;
    
    // Log current state before updates
    console.log('Current achievements state:', user.achievements);

    for (let achievement of user.achievements) {
      // Check for reset
      if (now >= new Date(achievement.resetDate)) {
        console.log(`Resetting achievement ${achievement.name}`);
        achievement.progress = 0;
        achievement.completed = false;
        achievement.resetDate = getNextResetDate(achievement.type);
        achievementsUpdated = true;
      }

      const oldProgress = achievement.progress;

      if (achievement.name === 'Daily Spotter') {
        achievement.progress = todayCount;
        console.log(`Updating Daily Spotter: ${oldProgress} -> ${achievement.progress}`);
        if (todayCount >= achievement.target && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = now;
          achievementsUpdated = true;
        }
      } else if (achievement.name === 'Airbus Expert') {
        achievement.progress = airbusCount;
        console.log(`Updating Airbus Expert: ${oldProgress} -> ${achievement.progress}`);
        if (airbusCount >= achievement.target && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = now;
          achievementsUpdated = true;
        }
      } else if (achievement.name === 'A321neo Hunter') {
        achievement.progress = a321neoCount;
        console.log(`Updating A321neo Hunter: ${oldProgress} -> ${achievement.progress}`);
        if (a321neoCount >= achievement.target && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = now;
          achievementsUpdated = true;
        }
      }

      // Force the achievement to be marked as modified
      user.markModified(`achievements`);
    }

    if (achievementsUpdated || true) { // Always save to ensure updates are persisted
      console.log('Saving updated achievements state:', user.achievements);
      try {
        await user.save();
        console.log('Successfully saved achievements');
      } catch (error) {
        console.error('Error saving achievements:', error);
        throw error;
      }
    }

    res.json(user.achievements);
  } catch (error) {
    console.error('Error in POST /:userId/update:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;