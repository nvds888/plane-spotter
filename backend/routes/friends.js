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

    const spots = await Spot.find({
      userId: { $in: user.friends }
    })
    .populate('userId', 'username')
    .sort({ timestamp: -1 })
    .limit(20);

    // Add reverse geocoding for each spot
    const spotsWithLocation = await Promise.all(spots.map(async (spot) => {
      try {
        const location = await geocoder.reverse({
          lat: spot.lat,
          lon: spot.lon
        });

        return {
          ...spot.toObject(),
          username: spot.userId.username,
          country: location[0]?.country || 'Unknown Location'
        };
      } catch (error) {
        console.error('Geocoding error:', error);
        return {
          ...spot.toObject(),
          username: spot.userId.username,
          country: 'Unknown Location'
        };
      }
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
      .sort({ timestamp: -1 })
      .limit(1);

    if (!latestSpot) {
      return res.json(null);
    }

    // Add reverse geocoding
    try {
      const location = await geocoder.reverse({
        lat: latestSpot.lat,
        lon: latestSpot.lon
      });

      const spotWithLocation = {
        ...latestSpot.toObject(),
        country: location[0]?.country || 'Unknown Location'
      };

      res.json(spotWithLocation);
    } catch (error) {
      console.error('Geocoding error:', error);
      res.json({
        ...latestSpot.toObject(),
        country: 'Unknown Location'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;