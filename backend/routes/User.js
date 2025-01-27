const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/user/:id/xp
router.get('/:id/xp', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error('User not found');
    res.json({ totalXP: user.totalXP, weeklyXP: user.weeklyXP });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;