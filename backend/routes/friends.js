const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');
const mongoose = require('mongoose');
const NodeGeocoder = require('node-geocoder');
const { getBestAirlineName } = require('../utils/airlineMapping');
const { getAirportName } = require('../utils/airportMapping');

const mapSpotToFrontend = (spot) => {
  // Handle both mongoose documents and plain objects
  const spotObj = spot.toObject ? spot.toObject() : spot;

  return {
    ...spotObj,
    flight: {
      hex: spotObj.flight?.system?.hex || 'N/A',
      flight: spotObj.flight?.flight || 'N/A',
      type: spotObj.flight?.type || 'N/A',
      alt: spotObj.flight?.geography?.altitude || 0,
      speed: spotObj.flight?.geography?.gspeed || 0,
      operator: getBestAirlineName(
        spotObj.flight?.operating_as,
        spotObj.flight?.painted_as
      ),
      lat: spotObj.flight?.geography?.latitude || 0,
      lon: spotObj.flight?.geography?.longitude || 0,
      departureAirport: getAirportName(spotObj.flight?.orig_iata) || 'N/A',
      arrivalAirport: getAirportName(spotObj.flight?.dest_iata) || 'N/A'
    }
  };
};

// Initialize geocoder
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  httpAdapter: 'fetch',
  apiVersion: '2.5',
  formatter: null,
  timeout: 5000,
  https: true,
  headers: {
    'User-Agent': 'PlaneSpotter/1.0 (your@email.com)',
  }
});

// Helper function to delay between requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function updateUserLocation(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    if (!user.location?.lastUpdated || 
        Date.now() - user.location.lastUpdated > 24 * 60 * 60 * 1000) {
      
      const latestSpot = await Spot.findOne({ userId: user._id })
        .sort({ timestamp: -1 });

      if (latestSpot) {
        try {
          await delay(1000);
          
          const location = await geocoder.reverse({
            lat: latestSpot.lat,
            lon: latestSpot.lon
          });

          user.location = {
            city: location[0]?.city || 'Unknown City',
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
          user.location = {
            city: 'Unknown City',
            country: 'Unknown Location',
            lastUpdated: new Date(),
            coordinates: {
              lat: latestSpot.lat,
              lon: latestSpot.lon
            }
          };
          await user.save();
        }
      }
    }
  } catch (error) {
    console.error('Error in updateUserLocation:', error);
  }
}

// Get user's followers
router.get('/:userId/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'username email');
    
    if (!user) throw new Error('User not found');
    
    res.json(user.followers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's following
router.get('/:userId/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'username email');
    
    if (!user) throw new Error('User not found');
    
    res.json(user.following);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find user by username
router.get('/find/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      _id: user._id,
      username: user.username
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow a user
router.post('/:userId/follow', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    const userToFollow = await User.findOne({ username: req.body.username });
    if (!userToFollow) throw new Error('User to follow not found');

    // Check if already following
    if (user.following.includes(userToFollow._id)) {
      throw new Error('Already following this user');
    }

    // Add to following list
    user.following.push(userToFollow._id);
    await user.save();

    // Add to followers list of the other user
    userToFollow.followers.push(user._id);
    await userToFollow.save();

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Unfollow a user
router.post('/:userId/unfollow', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    const userToUnfollow = await User.findOne({ username: req.body.username });
    if (!userToUnfollow) throw new Error('User to unfollow not found');

    // Remove from following list
    user.following = user.following.filter(id => !id.equals(userToUnfollow._id));
    await user.save();

    // Remove from followers list of the other user
    userToUnfollow.followers = userToUnfollow.followers.filter(id => !id.equals(user._id));
    await userToUnfollow.save();

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get following user's spots
router.get('/:userId/friend-spots', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new Error('User not found');

    const spots = await Spot.find({
      userId: { $in: user.following }
    })
    .populate('userId', 'username location')
    .sort({ timestamp: -1 })
    .limit(20);

    const uniqueUserIds = [...new Set(spots.map(spot => spot.userId._id))];
    await Promise.all(uniqueUserIds.map(updateUserLocation));

    // Re-fetch spots to get updated location information
    const updatedSpots = await Spot.find({
      userId: { $in: user.following }
    })
    .populate('userId', 'username location')
    .sort({ timestamp: -1 })
    .limit(20);

    const spotsWithLocation = updatedSpots.map(spot => ({
      ...mapSpotToFrontend(spot),
      username: spot.userId.username,
      country: spot.userId.location?.country || 'Unknown Location',
      guessResult: {
        isTypeCorrect: spot.isTypeCorrect,
        isAirlineCorrect: spot.isAirlineCorrect,
        isDestinationCorrect: spot.isDestinationCorrect,
        xpEarned: spot.baseXP + (spot.bonusXP || 0)
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
      .populate('userId', 'username location')
      .sort({ timestamp: -1 })
      .limit(1);

    if (!latestSpot) {
      return res.json(null);
    }

    await updateUserLocation(latestSpot.userId._id);

    const updatedSpot = await Spot.findById(latestSpot._id)
      .populate('userId', 'username location');

    const spotWithLocation = {
      ...mapSpotToFrontend(updatedSpot),
      city: updatedSpot.userId.location?.city || 'Unknown City',
      country: updatedSpot.userId.location?.country || 'Unknown Location'
    };

    res.json(spotWithLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;