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
// routes/Spot.js - Updated grouped endpoint
router.get('/grouped', async (req, res) => {
  try {
    const { userId, groupBy = 'type' } = req.query;
    let groupingField;
    let groupingPipeline = [];

    switch (groupBy) {
      case 'type':
        groupingField = '$flight.type';
        break;
      case 'date':
        // Group by month and year
        groupingPipeline = [
          {
            $addFields: {
              monthYear: {
                $dateToString: { 
                  format: "%Y-%m", 
                  date: { $toDate: "$timestamp" }
                }
              }
            }
          }
        ];
        groupingField = '$monthYear';
        break;
      case 'airline':
        // Extract first 3 characters of flight number
        groupingPipeline = [
          {
            $addFields: {
              airline: { 
                $substr: ['$flight.flight', 0, 3] 
              }
            }
          }
        ];
        groupingField = '$airline';
        break;
      case 'altitude':
        groupingPipeline = [
          {
            $addFields: {
              altitudeRange: {
                $switch: {
                  branches: [
                    { 
                      case: { $lt: ['$flight.alt', 10000] },
                      then: 'Low Altitude (0-10,000 ft)'
                    },
                    { 
                      case: { $lt: ['$flight.alt', 30000] },
                      then: 'Medium Altitude (10,000-30,000 ft)'
                    }
                  ],
                  default: 'High Altitude (30,000+ ft)'
                }
              }
            }
          }
        ];
        groupingField = '$altitudeRange';
        break;
      default:
        groupingField = '$flight.type';
    }

    const pipeline = [
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId)
        } 
      },
      ...groupingPipeline,
      { 
        $group: {
          _id: groupingField,
          count: { $sum: 1 },
          spots: { $push: "$$ROOT" }
        }
      },
      { 
        $sort: { count: -1 } 
      }
    ];

    const groupedSpots = await Spot.aggregate(pipeline);
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

    // Update achievements
    try {
      await fetch(`${req.protocol}://${req.get('host')}/api/achievements/${spot.userId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
      // Don't throw the error as the spot was still created successfully
    }

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