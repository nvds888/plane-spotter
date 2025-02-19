const express = require('express');
const router = express.Router();
const User = require('../models/User');
const cron = require('node-cron');

// Singleton class to manage spot resets
class SpotResetManager {
  constructor() {
    this.nextResetTime = this.calculateNextResetTime();
    this.initializeCronJob();
  }

  calculateNextResetTime() {
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setUTCHours(0, 0, 0, 0);
    
    if (now >= nextReset) {
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }
    
    return nextReset;
  }

  async resetAllUserSpots() {
    const now = new Date();
    try {
      const result = await User.updateMany(
        { 
          premium: false,
          $or: [
            { lastDailyReset: { $lt: this.nextResetTime } },
            { lastDailyReset: null }
          ]
        },
        { 
          $set: { 
            spotsRemaining: 4,
            lastDailyReset: now
          }
        }
      );
      
      console.log(`Reset spots for ${result.modifiedCount} users at ${now.toISOString()}`);
      this.nextResetTime = this.calculateNextResetTime();
      return result;
    } catch (error) {
      console.error('Error during spot reset:', error);
      throw error;
    }
  }

  initializeCronJob() {
    // Schedule reset job to run at midnight UTC
    cron.schedule('0 0 * * *', async () => {
      try {
        await this.resetAllUserSpots();
        console.log('Successfully ran daily spot reset via cron');
      } catch (error) {
        console.error('Error running daily spot reset via cron:', error);
      }
    }, {
      timezone: 'UTC'
    });
  }

  async checkAndResetIfNeeded(user) {
    const now = new Date();
    
    if (!user.lastDailyReset || new Date(user.lastDailyReset) < this.nextResetTime) {
      if (!user.premium) {
        user.spotsRemaining = 4;
        user.lastDailyReset = now;
        await user.save();
      }
      return true;
    }
    return false;
  }
}

// Create singleton instance
const spotResetManager = new SpotResetManager();

// Middleware to check and reset spots if needed
async function checkAndResetSpots(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await spotResetManager.checkAndResetIfNeeded(user);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// GET /api/user/:id/xp
router.get('/:id/xp', checkAndResetSpots, async (req, res) => {
  try {
    res.json({ 
      totalXP: req.user.totalXP, 
      weeklyXP: req.user.weeklyXP,
      nextResetTime: spotResetManager.nextResetTime,
      spotsRemaining: req.user.spotsRemaining,  // Add this
      dailySpotLimit: req.user.dailySpotLimit   // Add this
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// GET /api/user/:id
router.get('/:id', checkAndResetSpots, async (req, res) => {
  try {
    res.json({
      spotsRemaining: req.user.spotsRemaining,
      dailySpotLimit: req.user.dailySpotLimit,
      premium: req.user.premium,
      nextResetTime: spotResetManager.nextResetTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/:id/spots-remaining
router.get('/:id/spots-remaining', checkAndResetSpots, async (req, res) => {
  try {
    res.json({
      spotsRemaining: req.user.spotsRemaining,
      nextResetTime: spotResetManager.nextResetTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to decrement spots
async function decrementSpots(req, res, next) {
  try {
    if (!req.user.premium && req.user.spotsRemaining > 0) {
      req.user.spotsRemaining--;
      await req.user.save();
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Use both middlewares for routes that consume spots
router.post('/:id/spot', [checkAndResetSpots, decrementSpots], async (req, res) => {
  try {
    res.json({
      spotsRemaining: req.user.spotsRemaining,
      nextResetTime: spotResetManager.nextResetTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;