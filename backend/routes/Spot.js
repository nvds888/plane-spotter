const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper function to get next reset date in UTC
function getNextResetDate(type) {
  const now = new Date();
  
  if (type === 'daily') {
    const nextDay = new Date(now);
    nextDay.setUTCHours(24, 0, 0, 0);
    return nextDay;
  } else if (type === 'weekly') {
    const currentDay = now.getUTCDay();
    const daysUntilMonday = currentDay === 0 ? 1 : 1 + 7 - currentDay;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);
    return nextMonday;
  }
}

// Helper function to map spot to frontend format
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
      operator: spotObj.flight?.operating_as || spotObj.flight?.painted_as || 'Unknown',
      lat: spotObj.flight?.geography?.latitude || 0,
      lon: spotObj.flight?.geography?.longitude || 0,
      departureAirport: spotObj.flight?.orig_iata || 'N/A',
      arrivalAirport: spotObj.flight?.dest_iata || 'N/A'
    }
  };
};

// Get user's spots
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.query.userId)
      .populate('spots')
      .exec();
      
    const mappedSpots = user?.spots.map(mapSpotToFrontend) || [];
    res.json(mappedSpots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new spot
router.post('/', async (req, res) => {
  try {
    const spotData = {
      userId: req.body.userId,
      lat: req.body.lat,
      lon: req.body.lon,
      flight: req.body.flight,
      baseXP: 5,
      timestamp: new Date() // Add timestamp here
    };
    
    const spot = await Spot.create(spotData);

    // Award base XP
    await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: 5, weeklyXP: 5 } }
    );

    // Update achievements directly
    const user = await User.findById(spot.userId);
    if (user) {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Get stats
      const [dailyStats, weeklyStats] = await Promise.all([
        Spot.countDocuments({
          userId: user._id,
          timestamp: { $gte: startOfToday }
        }),
        Spot.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(user._id),
              timestamp: { $gte: startOfWeek },
              'flight.type': { $exists: true }
            }
          },
          {
            $group: {
              _id: null,
              airbusCount: {
                $sum: {
                  $cond: [
                    { $regexMatch: { 
                      input: '$flight.type', 
                      regex: '^A[0-9]' // This will match any Airbus code like A21N, A320, A359, etc.
                    }},
                    1,
                    0
                  ]
                }
              },
              a321neoCount: {
                $sum: {
                  $cond: [
                    { $eq: ['$flight.type', 'A21N'] }, // Exact match for A21N
                    1,
                    0
                  ]
                }
              }
            }
          }
        ])
      ]);

      const weeklyTypeCounts = weeklyStats[0] || { airbusCount: 0, a321neoCount: 0 };
      let achievementsUpdated = false;

      // Update achievements
      for (let achievement of user.achievements) {
        if (now >= new Date(achievement.resetDate)) {
          achievement.progress = 0;
          achievement.completed = false;
          achievement.resetDate = getNextResetDate(achievement.type);
          achievementsUpdated = true;
        }

        switch (achievement.name) {
          case 'Daily Spotter':
            achievement.progress = dailyStats;
            if (dailyStats >= achievement.target && !achievement.completed) {
              achievement.completed = true;
              achievement.completedAt = now;
              achievementsUpdated = true;
            }
            break;
          case 'Airbus Expert':
            achievement.progress = weeklyTypeCounts.airbusCount;
            if (weeklyTypeCounts.airbusCount >= achievement.target && !achievement.completed) {
              achievement.completed = true;
              achievement.completedAt = now;
              achievementsUpdated = true;
            }
            break;
          case 'A321neo Hunter':
            achievement.progress = weeklyTypeCounts.a321neoCount;
            if (weeklyTypeCounts.a321neoCount >= achievement.target && !achievement.completed) {
              achievement.completed = true;
              achievement.completedAt = now;
              achievementsUpdated = true;
            }
            break;
        }
      }

      if (achievementsUpdated) {
        user.markModified('achievements');
        await user.save();
      }
    }

    // Map to frontend format before sending response
    const mappedSpot = mapSpotToFrontend(spot);
    res.status(201).json(mappedSpot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Handle guesses
router.patch('/:id/guess', async (req, res) => {
  try {
    const spot = await Spot.findById(req.params.id);
    
    // Calculate correctness using FlightRadar24 data structure
    const isTypeCorrect = req.body.guessedType === spot.flight?.type;
    const isAirlineCorrect = req.body.guessedAirline === (spot.flight?.operating_as || spot.flight?.painted_as);
    // Always use IATA codes for destination comparison
    const isDestinationCorrect = req.body.guessedDestination === spot.flight?.dest_iata;

    // Log the comparison values for debugging
    console.log('Guess comparison:', {
      type: {
        guessed: req.body.guessedType,
        actual: spot.flight?.type,
        correct: isTypeCorrect
      },
      airline: {
        guessed: req.body.guessedAirline,
        actual: spot.flight?.operating_as,
        correct: isAirlineCorrect
      },
      destination: {
        guessed: req.body.guessedDestination,
        actual: spot.flight?.dest_iata,
        correct: isDestinationCorrect
      }
    });

    // Calculate bonus XP - 10 points for each correct guess
    const bonusXP = (isTypeCorrect ? 10 : 0) + 
                    (isAirlineCorrect ? 10 : 0) + 
                    (isDestinationCorrect ? 10 : 0);

    const updatedSpot = await Spot.findByIdAndUpdate(
      req.params.id,
      {
        guessedType: req.body.guessedType,
        guessedAirline: req.body.guessedAirline,
        guessedDestination: req.body.guessedDestination,
        isTypeCorrect,
        isAirlineCorrect,
        isDestinationCorrect,
        bonusXP
      },
      { new: true }
    );

    // Award XP to user
    await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: bonusXP, weeklyXP: bonusXP } }
    );

    // Map to frontend format before sending response
    const mappedSpot = mapSpotToFrontend(updatedSpot);
    res.json(mappedSpot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get grouped spots
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
        groupingField = '$flight.operating_as';
        break;
      case 'altitude':
        groupingPipeline = [
          {
            $addFields: {
              altitudeRange: {
                $switch: {
                  branches: [
                    { 
                      case: { $lt: ['$flight.geography.altitude', 10000] },
                      then: 'Low Altitude (0-10,000 ft)'
                    },
                    { 
                      case: { $lt: ['$flight.geography.altitude', 30000] },
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
    
    // Map the grouped spots to frontend format
    const mappedGroupedSpots = groupedSpots.map(group => ({
      ...group,
      spots: group.spots.map(mapSpotToFrontend)
    }));
    
    res.json(mappedGroupedSpots);
  } catch (error) {
    console.error('Error in /grouped endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;