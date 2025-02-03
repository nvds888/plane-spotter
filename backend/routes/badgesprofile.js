// badgesprofile.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');

// Helper function to get next reset date in UTC (reused from achievements.js)
// Helper function to get next reset date in UTC
function getNextResetDate(type) {
  const now = new Date();
  if (type === 'daily') {
    const nextDay = new Date(now);
    nextDay.setUTCHours(24, 0, 0, 0);
    return nextDay;
  }
}

// Modified updateStreak function to use getNextResetDate
async function updateStreak(user) {
  const now = new Date();
  const lastResetDate = getNextResetDate('daily');
  const lastSpotDate = user.lastSpotDate ? new Date(user.lastSpotDate) : null;

  // If there's no last spot date, this is the first spot
  if (!lastSpotDate) {
    user.currentStreak = 1;
    return;
  }

  // Check if we've passed the reset time
  if (now >= lastResetDate) {
    // Check if the last spot was before the previous reset
    const previousReset = new Date(lastResetDate);
    previousReset.setDate(previousReset.getDate() - 1);
    
    if (lastSpotDate < previousReset) {
      // More than a day has passed, reset streak
      user.currentStreak = 1;
    } else {
      // Within the window, increment streak
      user.currentStreak += 1;
    }
  }

  // Update longest streak if current streak is longer
  if (user.currentStreak > user.longestStreak) {
    user.longestStreak = user.currentStreak;
  }

  user.lastSpotDate = now;
}

// Helper function to check and award badges
async function checkAndAwardBadges(user) {
  const badges = [];

  // Check for Plane Spotter Starter badge
  if (user.totalSpots >= 1 && !user.badges.find(b => b.id === 'plane_spotter_starter')) {
    badges.push({
      id: 'plane_spotter_starter',
      name: 'Plane Spotter Starter',
      description: 'Spotted your first aircraft',
      icon: 'Plane',
      rarity: 'common',
      earnedAt: new Date()
    });
  }

  // Add badge for 7-day streak
  if (user.currentStreak >= 7 && !user.badges.find(b => b.id === 'week_streak')) {
    badges.push({
      id: 'week_streak',
      name: '7-Day Streak',
      description: 'Spotted aircraft for 7 consecutive days',
      icon: 'Calendar',
      rarity: 'rare',
      earnedAt: new Date()
    });
  }

  // Add any new badges to user
  if (badges.length > 0) {
    user.badges.push(...badges);
  }

  return badges;
}

// Get user profile and badges
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const spots = await Spot.find({ userId: req.params.userId });
    
    // Update total spots
    user.totalSpots = spots.length;

    // Update streak if needed
    await updateStreak(user);

    // Check and award any new badges
    const newBadges = await checkAndAwardBadges(user);

    // Save any updates
    await user.save();

    // Prepare response data
    const profileData = {
      username: user.username,
      joinDate: user.createdAt,
      stats: {
        totalSpots: user.totalSpots,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        followers: user.followers.length,
        following: user.following.length
      },
      badges: user.badges,
      newBadges: newBadges
    };

    res.json(profileData);
  } catch (error) {
    console.error('Error in profile route:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;