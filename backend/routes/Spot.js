const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const User = require('../models/User');
const mongoose = require('mongoose');
const { getBestAirlineName } = require('../utils/airlineMapping');
const { getAirportName } = require('../utils/airportMapping');

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
      operator: getBestAirlineName(
        spotObj.flight?.operating_as,
        spotObj.flight?.painted_as
      ),
      lat: spotObj.flight?.geography?.latitude || 0,
      lon: spotObj.flight?.geography?.longitude || 0,
      geography: {
        direction: spotObj.flight?.geography?.direction || 0
      },
      departureAirport: getAirportName(spotObj.flight?.orig_iata) || 'N/A',
      arrivalAirport: getAirportName(spotObj.flight?.dest_iata) || 'N/A'
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
    const now = new Date();
    
    // Create the current spot
    const spotData = {
      userId: req.body.userId,
      lat: req.body.lat,
      lon: req.body.lon,
      flight: req.body.flight,
      baseXP: 5,
      timestamp: now
    };

    const spot = await Spot.create(spotData);
    await spot.save();

    // Award base XP
    await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: 5, weeklyXP: 5 } }
    );

    // Find all spots by this user in a small time window (e.g., last 5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
    const userSpots = await Spot.find({
      userId: req.body.userId,
      timestamp: { $gte: fiveMinutesAgo, $lte: now }
    });

    // Prepare flights to log
    let flightsToLog = userSpots.flatMap(userSpot => {
      const spot = userSpot.toObject();
      
      // Handle both array and single flight scenarios
      if (Array.isArray(spot.flight)) {
        return spot.flight.map(f => ({
          flight: f.flight || f?.flight?.flight,
          operator: f.operator || getBestAirlineName(
            f?.flight?.operating_as, 
            f?.flight?.painted_as
          ),
          altitude: f.alt || f?.flight?.geography?.altitude,
          departure: f.departureAirport || getAirportName(f?.flight?.orig_iata),
          destination: f.arrivalAirport || getAirportName(f?.flight?.dest_iata),
          hex: f.hex || f?.flight?.system?.hex,
          spotId: userSpot._id.toString() // Add spot ID for reference
        }));
      } else {
        const f = spot.flight;
        return [{
          flight: f.flight || f?.flight,
          operator: f.operator || getBestAirlineName(
            f?.operating_as, 
            f?.painted_as
          ),
          altitude: f.alt || f?.geography?.altitude,
          departure: f.departureAirport || getAirportName(f?.orig_iata),
          destination: f.arrivalAirport || getAirportName(f?.dest_iata),
          hex: f.hex || f?.system?.hex,
          spotId: userSpot._id.toString() // Add spot ID for reference
        }];
      }
    });

    // Log all flights in a single group transaction
    const { spawn } = require('child_process');
    const pythonProcess = spawn('python', [
      'algorand_logger.py',
      JSON.stringify(flightsToLog)
    ]);

    // Add error handling and logging as before...

    const mappedSpot = mapSpotToFrontend(spot);
    res.status(201).json(mappedSpot);
  } catch (error) {
    console.error('Error in spot creation:', error);
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
router.get('/all', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const spots = await Spot.find({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).sort({ timestamp: -1 });
    
    const mappedSpots = spots.map(spot => ({
      ...mapSpotToFrontend(spot),
      guessResult: {
        isTypeCorrect: spot.isTypeCorrect,
        isAirlineCorrect: spot.isAirlineCorrect,
        isDestinationCorrect: spot.isDestinationCorrect,
        xpEarned: spot.baseXP + (spot.bonusXP || 0)
      }
    }));
    
    res.json(mappedSpots);
  } catch (error) {
    console.error('Error in /all endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;