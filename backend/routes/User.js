const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/user/:id/xp
router.get('/:id/xp', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      totalXP: user.totalXP,
      weeklyXP: user.weeklyXP,
      spotsRemaining: user.spotsRemaining,
      dailySpotLimit: user.dailySpotLimit
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// GET /api/user/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

// GET /api/user/:id/spots-remaining
router.get('/:id/spots-remaining', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      spotsRemaining: user.spotsRemaining
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;