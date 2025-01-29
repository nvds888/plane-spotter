const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');
const mongoose = require('mongoose');
const NodeGeocoder = require('node-geocoder');

// Initialize geocoder
const geocoder = NodeGeocoder({
  provider: 'openstreetmap'
});

// Helper function to update user location
async function updateUserLocation(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Check if location needs updating (older than 24 hours or doesn't exist)
    if (!user.location?.lastUpdated || 
        Date.now() - user.location.lastUpdated > 24 * 60 * 60 * 1000) {
      
      // Get user's latest spot
      const latestSpot = await Spot.findOne({ userId: user._id })
        .sort({ timestamp: -1 });

      if (latestSpot) {
        try {
          const location = await geocoder.reverse({
            lat: latestSpot.lat,
            lon: latestSpot.lon
          });

          user.location = {
            country: location[0]?.country || 'Unknown Location',
            lastUpdated: new Date(),
            coordinates: {
              lat: latestSpot.lat,
              lon: latestSpot.lon
            }
          };
          await user.save();
        } catch (error) {
          console.error(`Failed to update location for user ${user._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in updateUserLocation:', error);
  }
}

// Get user's friends
router.get('/:userId/friends', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('friends', 'username email');
    
    if (!user) throw new Error('User not found');
    
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add friend
router.post('/:userId/friends', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    const friend = await User.findOne({ username: req.body.friendUsername });
    if (!friend) throw new Error('Friend not found');

    if (user.friends.includes(friend._id)) {
      throw new Error('Already friends with this user');
    }

    user.friends.push(friend._id);
    await user.save();

    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get friend's spots
router.get('/:userId/friend-spots', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    // First get all spots
    const spots = await Spot.find({
      userId: { $in: user.friends }
    })
    .populate('userId', 'username location')
    .sort({ timestamp: -1 })
    .limit(20);

    // Update locations for users who need it
    const uniqueUserIds = [...new Set(spots.map(spot => spot.userId._id))];
    await Promise.all(uniqueUserIds.map(updateUserLocation));

    // Fetch spots again with updated locations
    const updatedSpots = await Spot.find({
      userId: { $in: user.friends }
    })
    .populate('userId', 'username location')
    .sort({ timestamp: -1 })
    .limit(20);

    const spotsWithLocation = updatedSpots.map(spot => ({
      ...spot.toObject(),
      username: spot.userId.username,
      country: spot.userId.location?.country || 'Unknown Location'
    }));

    res.json(spotsWithLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest global spot
router.get('/spots/latest', async (req, res) => {
  try {
    const latestSpot = await Spot.findOne()
      .populate('userId', 'username location')
      .sort({ timestamp: -1 })
      .limit(1);

    if (!latestSpot) {
      return res.json(null);
    }

    // Update location if needed
    await updateUserLocation(latestSpot.userId._id);

    // Fetch updated spot with new location
    const updatedSpot = await Spot.findById(latestSpot._id)
      .populate('userId', 'username location');

    const spotWithLocation = {
      ...updatedSpot.toObject(),
      country: updatedSpot.userId.location?.country || 'Unknown Location'
    };

    res.json(spotWithLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;