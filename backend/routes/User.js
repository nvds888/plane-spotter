const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { triggerManualReset } = require('./dailyReset');

// Helper function to get next reset date in UTC
function getNextResetDate(type) {
  const now = new Date();
  
  if (type === 'daily') {
    const nextDay = new Date(now);
    nextDay.setUTCDate(now.getUTCDate() + 1);  // Explicitly add one day
    nextDay.setUTCHours(0, 0, 0, 0);           // Reset to midnight UTC
    return nextDay;
  }
}

// GET /api/user/:id/xp
router.get('/:id/xp', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error('User not found');

    // Check if we need to reset daily spots for this specific user
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(0, 0, 0, 0);

    if (!user.lastDailyReset || new Date(user.lastDailyReset) < resetTime) {
      // Reset spots only for this specific user
      if (!user.premium) {
        user.spotsRemaining = 4;
      }
      user.lastDailyReset = now;
      await user.save();
    }

    res.json({ totalXP: user.totalXP, weeklyXP: user.weeklyXP });
  } catch (error) {
    console.error('Error in XP endpoint:', error);
    res.status(404).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if we need to reset daily spots for this specific user
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(0, 0, 0, 0);

    if (!user.lastDailyReset || new Date(user.lastDailyReset) < resetTime) {
      // Reset spots only for this specific user
      if (!user.premium) {
        user.spotsRemaining = 4;
      }
      user.lastDailyReset = now;
      await user.save();
    }

    res.json({
      spotsRemaining: user.spotsRemaining,
      dailySpotLimit: user.dailySpotLimit,
      premium: user.premium
    });
  } catch (error) {
    console.error('Error in user endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optional: Admin endpoint for manual resets
router.post('/admin/reset-spots', async (req, res) => {
  try {
    const result = await triggerManualReset();
    res.json({ message: 'Manual reset completed', result });
  } catch (error) {
    console.error('Error in manual reset:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;