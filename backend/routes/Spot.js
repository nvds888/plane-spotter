const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper function to map spot to frontend format
const mapSpotToFrontend = (spot) => {
  // Handle both mongoose documents and plain objects
  const spotObj = spot.toObject ? spot.toObject() : spot;
  return {
    ...spotObj,
    flight: {
      hex: spotObj.flight.aircraft?.icao24 || 'N/A',
      flight: spotObj.flight.flight?.icaoNumber || 'N/A',
      type: spotObj.flight.aircraft?.iataCode || 'N/A',
      alt: spotObj.flight.geography?.altitude || 0,
      speed: spotObj.flight.speed?.horizontal || 0,
      operator: spotObj.flight.airline?.iataCode || 'Unknown',
      lat: spotObj.flight.geography?.latitude || 0,
      lon: spotObj.flight.geography?.longitude || 0,
      departureAirport: spotObj.flight.departure?.iataCode || 'N/A',
      arrivalAirport: spotObj.flight.arrival?.iataCode || 'N/A'
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
      baseXP: 5
    };
    
    const spot = await Spot.create(spotData);

    // Award base XP
    await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: 5, weeklyXP: 5 } }
    );

    // Update achievements
    try {
      await fetch(`${req.protocol}://${req.get('host')}/api/achievements/${spot.userId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
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
    
    // Calculate correctness using Aviation Edge data structure
    const isTypeCorrect = req.body.guessedType === spot.flight.aircraft.icaoCode;
    const altitude = spot.flight.geography.altitude;
    const actualAltRange = altitude < 10000 ? '0-10,000 ft' :
      altitude <= 30000 ? '10,000-30,000 ft' : '30,000+ ft';
    const isAltitudeCorrect = req.body.guessedAltitudeRange === actualAltRange;

    const bonusXP = (isTypeCorrect ? 10 : 0) + (isAltitudeCorrect ? 10 : 0);

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
        groupingField = '$flight.aircraft.icaoCode';
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
        groupingField = '$flight.airline.icaoCode';
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
        groupingField = '$flight.aircraft.icaoCode';
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