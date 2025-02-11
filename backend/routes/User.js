const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Helper function to get next reset date in UTC (reusing from achievements.js)
function getNextResetDate(type) {
  const now = new Date();
  
  if (type === 'daily') {
    const nextDay = new Date(now);
    nextDay.setUTCDate(now.getUTCDate() + 1);  // Explicitly add one day
    nextDay.setUTCHours(0, 0, 0, 0);           // Reset to midnight UTC
    return nextDay;
  }
}

// Reset spots for all non-premium users
async function resetDailySpots() {
  try {
    const result = await User.updateMany(
      { premium: false },
      { $set: { spotsRemaining: 4 } }
    );
    console.log('Reset daily spots for non-premium users:', result);
  } catch (error) {
    console.error('Error resetting daily spots:', error);
  }
}

// GET /api/user/:id/xp
router.get('/:id/xp', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error('User not found');

    // Check if we need to reset daily spots
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(0, 0, 0, 0);

    if (!user.lastDailyReset || new Date(user.lastDailyReset) < resetTime) {
      // Reset spots for this specific user
      if (!user.premium) {
        user.spotsRemaining = 4;
      }
      user.lastDailyReset = now;
      await user.save();

      // Trigger reset for all users
      await resetDailySpots();
    }

    res.json({ totalXP: user.totalXP, weeklyXP: user.weeklyXP });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if we need to reset daily spots
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(0, 0, 0, 0);

    if (!user.lastDailyReset || new Date(user.lastDailyReset) < resetTime) {
      // Reset spots for this specific user
      if (!user.premium) {
        user.spotsRemaining = 4;
      }
      user.lastDailyReset = now;
      await user.save();

      // Trigger reset for all users
      await resetDailySpots();
    }

    res.json({
      spotsRemaining: user.spotsRemaining,
      dailySpotLimit: user.dailySpotLimit,
      premium: user.premium
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;