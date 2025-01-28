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

// Initialize achievements for a user (unchanged)
async function initializeAchievements(userId) { /* ... */ }

// Get user's achievements (unchanged, reset logic remains)
router.get('/:userId', async (req, res) => { /* ... */ });

// Update achievements progress (corrected date handling)
router.post('/:userId/update', async (req, res) => {
  try {
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

    // Update achievements
    let achievementsUpdated = false;
    user.achievements.forEach(achievement => {
      if (new Date() >= new Date(achievement.resetDate)) {
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
        achievement.progress = airbusCount;
        if (airbusCount >= achievement.target && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = now;
          achievementsUpdated = true;
        }
      }
    });

    if (achievementsUpdated) await user.save();
    res.json(user.achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;