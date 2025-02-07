const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const User = require('../models/User');
const mongoose = require('mongoose');
const { getBestAirlineName } = require('../utils/airlineMapping');
const { getAirportName } = require('../utils/airportMapping');

let spotBuffer = [];
let spotIdBuffer = []; // Added to track spot IDs
let lastSpotTime = null;
const BUFFER_WINDOW = 1000; // 1 second window to collect flights from same spot

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
    console.log("Starting spot creation with data:", req.body);
    const now = new Date();
    
    // First get the user's Algorand address
    const user = await User.findById(req.body.userId);
    if (!user || !user.algorandAddress) {
      throw new Error('User not found or has no Algorand address');
    }

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
    console.log("Spot created and saved:", spot);

    await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: 5, weeklyXP: 5 } }
    );
    console.log("Base XP awarded");

    // Prepare flight for Algorand with user's address
    const flightToLog = {
      flight: req.body.flight.flight || 'N/A',
      operator: req.body.flight.operating_as || req.body.flight.painted_as || 'Unknown',
      altitude: req.body.flight.geography?.altitude || 0,
      departure: req.body.flight.orig_iata || 'Unknown',
      destination: req.body.flight.dest_iata || 'Unknown',
      hex: req.body.flight.system?.hex || 'N/A',
      userAddress: user.algorandAddress,
      coordinates: {
        lat: req.body.flight.geography?.latitude || 0,
        lon: req.body.flight.geography?.longitude || 0
      }
    };

    // Buffer logic
    const currentTime = Date.now();
    if (lastSpotTime && (currentTime - lastSpotTime) < BUFFER_WINDOW) {
      spotBuffer.push(flightToLog);
      spotIdBuffer.push(spot._id);
    } else {
      if (spotBuffer.length > 0) {
        const { spawn } = require('child_process');
        const pythonProcess = spawn('python', [
          'algorand_logger.py',
          JSON.stringify(spotBuffer)
        ]);

        pythonProcess.stdout.on('data', async (data) => {
          const output = data.toString();
          console.log('Algorand logging output:', output);
          
          // Extract group ID from the output using regex
          const groupIdMatch = output.match(/Group transaction ID: (\w+)/);
          if (groupIdMatch && groupIdMatch[1]) {
            const groupId = groupIdMatch[1];
            try {
              // Add more detailed logging
              console.log('Attempting to update spots with IDs:', spotIdBuffer);
              
              // Use Promise.all to update all spots and wait for completion
              const updateResults = await Promise.all(
                spotIdBuffer.map(async (spotId) => {
                  const result = await Spot.findByIdAndUpdate(
                    spotId,
                    { algorandGroupId: groupId },
                    { new: true } // Return updated document
                  );
                  console.log(`Update result for spot ${spotId}:`, result);
                  return result;
                })
              );
              
              console.log('Update completed for all spots:', updateResults);
            } catch (error) {
              console.error('Error updating spots with Algorand group ID:', error);
              // Log more details about the error
              console.error('Full error details:', {
                error: error.message,
                stack: error.stack,
                spotIds: spotIdBuffer,
                groupId: groupId
              });
            }
          }
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error('Algorand logging error:', data.toString());
        });
      }
      spotBuffer = [flightToLog];
      spotIdBuffer = [spot._id];
    }
    lastSpotTime = currentTime;

    // Set timeout to flush buffer if no new flights come in
    setTimeout(() => {
      if (spotBuffer.length > 0 && (Date.now() - lastSpotTime) >= BUFFER_WINDOW) {
        const { spawn } = require('child_process');
        const pythonProcess = spawn('python', [
          'algorand_logger.py',
          JSON.stringify(spotBuffer)
        ]);

        pythonProcess.stdout.on('data', async (data) => {
          const output = data.toString();
          console.log('Algorand logging output:', output);
          
          // Extract group ID from the output using regex
          const groupIdMatch = output.match(/Group transaction ID: (\w+)/);
          if (groupIdMatch && groupIdMatch[1]) {
            const groupId = groupIdMatch[1];
            try {
              // Update all spots in the buffer with the group ID
              for (const spotId of spotIdBuffer) {
                await Spot.findByIdAndUpdate(spotId, {
                  algorandGroupId: groupId
                });
              }
              console.log('Updated spots with Algorand group ID:', groupId);
            } catch (error) {
              console.error('Error updating spots with Algorand group ID:', error);
            }
          }
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error('Algorand logging error:', data.toString());
        });
        
        spotBuffer = [];
        spotIdBuffer = [];
      }
    }, BUFFER_WINDOW);

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
    
    const isTypeCorrect = req.body.guessedType === spot.flight?.type;
    const isAirlineCorrect = req.body.guessedAirline === (spot.flight?.operating_as || spot.flight?.painted_as);
    const isDestinationCorrect = req.body.guessedDestination === spot.flight?.dest_iata;

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

    await User.findByIdAndUpdate(
      spot.userId,
      { $inc: { totalXP: bonusXP, weeklyXP: bonusXP } }
    );

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