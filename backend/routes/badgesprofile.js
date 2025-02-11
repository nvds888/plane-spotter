// badgesprofile.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');

// Helper function to get next reset date in UTC
function getNextResetDate(type) {
  const now = new Date();
  if (type === 'daily') {
    const nextDay = new Date(now);
    nextDay.setUTCHours(24, 0, 0, 0);
    return nextDay;
  }
}

// Fixed updateStreak function
async function updateStreak(user) {
  const now = new Date();
  const lastSpotDate = user.lastSpotDate ? new Date(user.lastSpotDate) : null;

  // If there's no last spot date, this is the first spot
  if (!lastSpotDate) {
    user.currentStreak = 1;
    user.lastSpotDate = now;
    return;
  }

  // Convert dates to UTC midnight for accurate day comparison
  const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const lastSpotUTC = new Date(Date.UTC(lastSpotDate.getUTCFullYear(), lastSpotDate.getUTCMonth(), lastSpotDate.getUTCDate()));

  // Calculate the difference in days
  const diffDays = Math.floor((nowUTC - lastSpotUTC) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day, don't update streak
    return;
  } else if (diffDays === 1) {
    // Next day, increment streak
    user.currentStreak += 1;
  } else {
    // More than one day has passed, reset streak to 0 FIRST
    user.currentStreak = 0;
    // Then set it to 1 since they're spotting today
    user.currentStreak = 1;
  }

  // Update longest streak if current streak is longer
  if (user.currentStreak > user.longestStreak) {
    user.longestStreak = user.currentStreak;
  }

  // Update last spot date
  user.lastSpotDate = now;
}

async function checkAndResetStaleStreak(user) {
  if (!user.lastSpotDate) return false;

  const now = new Date();
  // Quick check - if last spot was less than 24 hours ago, no need to do further calculations
  if ((now - new Date(user.lastSpotDate)) < 24 * 60 * 60 * 1000) {
    return false;
  }

  // Get the next reset time (UTC midnight)
  const nextReset = getNextResetDate('daily');
  // Get previous reset time
  const previousReset = new Date(nextReset);
  previousReset.setUTCHours(previousReset.getUTCHours() - 24);
  
  const lastSpotTime = new Date(user.lastSpotDate);

  // Only reset streak if:
  // 1. Their last spot was before the previous reset AND
  // 2. We've passed the current day's reset time
  if (lastSpotTime < previousReset && now > nextReset) {
    user.currentStreak = 0;
    return true;
  }
  return false;
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

    // Initialize badges array if it doesn't exist
    if (!user.badges) {
      user.badges = [];
    }

    const spots = await Spot.find({ userId: req.params.userId });
    
    // Update total spots
    user.totalSpots = spots.length;

    // Check and reset stale streak - only if significant time has passed
    const wasStreakReset = await checkAndResetStaleStreak(user);
    if (wasStreakReset) {
      await user.save();
    }

    // Check and award any new badges
    const newBadges = await checkAndAwardBadges(user);

    // Save any updates
    await user.save();

    // Prepare response data
    const profileData = {
      username: user.username,
      joinDate: user.createdAt || new Date(),
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

module.exports = {
  router,
  updateStreak
};