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
    console.log("Starting spot creation with data:", JSON.stringify(req.body, null, 2));

    const now = new Date();
    const spotData = {
      userId: req.body.userId,
      lat: req.body.lat,
      lon: req.body.lon,
      flight: req.body.flight,
      baseXP: 5,
      timestamp: now
    };

    console.log("Preparing to create spot with data:", spotData);

    const spot = await Spot.create(spotData);
    await spot.save();
    console.log("Spot created and saved:", spot._id);

    // Award base XP
    const userUpdate = await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: 5, weeklyXP: 5 } },
      { new: true }
    );
    console.log("Base XP awarded. User's new total XP:", userUpdate.totalXP);

    // Prepare flights for Algorand logging
    let flightsToLog = [];
    
    // If flight is an array, handle multiple flights
    if (Array.isArray(req.body.flight)) {
      flightsToLog = req.body.flight.map(f => ({
        flight: f.flight,
        operator: f.operator,
        altitude: f.alt,
        departure: f.departureAirport,
        destination: f.arrivalAirport,
        hex: f.hex
      }));
    } else {
      // Single flight
      flightsToLog = [{
        flight: req.body.flight.flight,
        operator: req.body.flight.operator,
        altitude: req.body.flight.alt,
        departure: req.body.flight.departureAirport,
        destination: req.body.flight.arrivalAirport,
        hex: req.body.flight.hex
      }];
    }

    console.log("Flights to log to Algorand:", JSON.stringify(flightsToLog, null, 2));

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