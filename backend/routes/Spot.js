const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const User = require('../models/User');
const mongoose = require('mongoose');


// Get user's spots
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.query.userId)
      .populate('spots')
      .exec();
      
    res.json(user?.spots || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's spots grouped by aircraft type
router.get('/grouped', async (req, res) => {
  try {
    const groupedSpots = await Spot.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(req.query.userId) // Use 'new' keyword here
        } 
      },
      { 
        $group: {
          _id: "$flight.type",
          count: { $sum: 1 },
          spots: { $push: "$$ROOT" }
        }
      },
      { 
        $sort: { "_id": 1 } 
      }
    ]);

    res.json(groupedSpots);
  } catch (error) {
    console.error('Error in /grouped endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// routes/Spot.js
router.post('/', async (req, res) => {
  try {
    const spotData = { ...req.body, baseXP: 5 };
    const spot = await Spot.create(spotData);

    // Always award 5 XP per spot
    const baseXP = 5; 
    console.log('Awarding Base XP:', baseXP);

    // Update user XP
    await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: baseXP, weeklyXP: baseXP } }
    );

    res.status(201).json(spot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH /api/spot/:id/guess - New route for guesses
router.patch('/:id/guess', async (req, res) => {
  try {
    const spot = await Spot.findById(req.params.id);
    const flight = spot.flight;
    
    // Calculate correctness
    const isTypeCorrect = req.body.guessedType === flight.type;
    const actualAltRange = flight.alt < 10000 ? '0-10,000 ft' :
      flight.alt <= 30000 ? '10,000-30,000 ft' : '30,000+ ft';
    const isAltitudeCorrect = req.body.guessedAltitudeRange === actualAltRange;

    // Calculate bonus XP
    const bonusXP = (isTypeCorrect ? 10 : 0) + (isAltitudeCorrect ? 10 : 0);

    // Update spot
    const updatedSpot = await Spot.findByIdAndUpdate(
      req.params.id,
      {
        guessedType: req.body.guessedType,
        guessedAltitudeRange: req.body.guessedAltitudeRange,
        isTypeCorrect,
        isAltitudeCorrect,
        bonusXP
      },
      { new: true }
    );

    // Update user XP
    await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: bonusXP, weeklyXP: bonusXP } }
    );

    res.json(updatedSpot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;