const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const User = require('../models/User');
const mongoose = require('mongoose');
const { getBestAirlineName } = require('../utils/airlineMapping');
const { getAirportName } = require('../utils/airportMapping');
const { updateStreak } = require('./badgesprofile');  
const { spotResetManager } = require('./User.js');  

let spotBuffer = [];
let spotIdBuffer = [];
let lastSpotTime = null;
const BUFFER_WINDOW = 1000; // 1 second window to collect flights from same spot

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

const mapSpotToFrontend = (spot) => {
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
      operating_as: spotObj.flight?.operating_as || 'N/A',
painted_as: spotObj.flight?.painted_as || 'N/A',
      lat: spotObj.flight?.geography?.latitude || 0,
      lon: spotObj.flight?.geography?.longitude || 0,
      geography: {
        direction: spotObj.flight?.geography?.direction || 0
      },
      orig_iata: spotObj.flight?.orig_iata || 'N/A',
      dest_iata: spotObj.flight?.dest_iata || 'N/A',
      departureAirport: getAirportName(spotObj.flight?.orig_iata) || 'N/A',
      arrivalAirport: getAirportName(spotObj.flight?.dest_iata) || 'N/A'
    }
  };
};

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

async function processAlgorandTransaction(spotIds, buffer) {
  const { spawn } = require('child_process');
  console.log('Processing Algorand transaction for spots:', spotIds);
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      'algorand_logger.py',
      JSON.stringify(buffer)
    ]);

    pythonProcess.stdout.on('data', async (data) => {
      const output = data.toString();
      console.log('Algorand logging output:', output);
      
      const groupIdMatch = output.match(/Group transaction ID: (\w+)/);
      if (groupIdMatch && groupIdMatch[1]) {
        const groupId = groupIdMatch[1];
        console.log('Found group ID:', groupId);
        console.log('Updating spots with IDs:', spotIds);
        
        try {
          const bulkOps = spotIds.map(spotId => ({
            updateOne: {
              filter: { _id: spotId },
              update: { $set: { algorandGroupId: groupId } },
              upsert: false
            }
          }));

          const result = await Spot.bulkWrite(bulkOps);
          console.log('Bulk update result:', result);
          resolve(result);
        } catch (error) {
          console.error('Error updating spots:', error);
          reject(error);
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Algorand logging error:', data.toString());
      reject(new Error(data.toString()));
    });

    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error);
      reject(error);
    });
  });
}

router.post('/', async (req, res) => {
  let currentSpotIds = [];  // Track IDs for this request
  
  try {
    console.log("Starting spot creation with data:", req.body);
    const now = new Date();
    
    const user = await User.findById(req.body.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const nextResetTimestamp = new Date(spotResetManager.nextResetTime).setUTCHours(0,0,0,0);
    const lastResetTimestamp = new Date(user.lastDailyReset).setUTCHours(0,0,0,0);
    
    if (!user.lastDailyReset || lastResetTimestamp < nextResetTimestamp) {
      if (!user.premium) {
        user.spotsRemaining = 4;
        user.lastDailyReset = now;
        await user.save();
      }
    }

    console.log('User status:', {  // Add this block
      userId: user._id,
      premium: user.premium,
      spotsRemaining: user.spotsRemaining,
      lastReset: user.lastDailyReset
    });

    // Check spot limit for non-premium users
    if (!user.premium && user.spotsRemaining <= 0) {
      return res.status(403).json({ 
        error: 'Daily spot limit reached',
        nextResetTime: user.lastDailyReset  // Add this
      });
    }

    // Verify algorand address
    if (!user.algorandAddress) {
      throw new Error('No Algorand address found');
    }

    const spotData = {
      userId: req.body.userId,
      lat: req.body.lat,
      lon: req.body.lon,
      flight: req.body.flight,
      baseXP: req.body.isTeleport ? 10 : 5,  // Modified this line
      isTeleport: req.body.isTeleport || false,  // Added this
      location: req.body.location || null,     // Added this
      timestamp: now
    };

    // In Spot.js, change the user update part after spot creation:
const spot = await Spot.create(spotData);
await spot.save();
console.log('Spot created:', spot._id);

await updateStreak(user, now);
await user.save();
console.log("Spot created and saved:", spot);
currentSpotIds.push(spot._id);

// Update user XP and decrease spots remaining by EXACTLY 1 (not using $inc for spotsRemaining)
await User.findByIdAndUpdate(
  spot.userId,
  { 
    $inc: { 
      totalXP: spotData.baseXP,    
      weeklyXP: spotData.baseXP,
      ...(user.premium ? {} : req.body.isFirstSpot ? { spotsRemaining: -1 } : {})  // Only decrement on first plane
    }
  }
);

console.log('User updated after spot creation:', {  // Add this block
  userId: user._id,
  newSpotsRemaining: user.spotsRemaining,
  xpAdded: spotData.baseXP
});

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

    const currentTime = Date.now();
    if (lastSpotTime && (currentTime - lastSpotTime) < BUFFER_WINDOW) {
      console.log("Adding to existing buffer");
      spotBuffer.push(flightToLog);
      spotIdBuffer = [...spotIdBuffer, ...currentSpotIds];
      console.log("Current spotIdBuffer:", spotIdBuffer);
    } else {
      console.log("Creating new buffer");
      if (spotBuffer.length > 0) {
        try {
          await processAlgorandTransaction([...spotIdBuffer], [...spotBuffer]);
        } catch (error) {
          console.error('Error processing Algorand transaction:', error);
        }
      }
      spotBuffer = [flightToLog];
      spotIdBuffer = [...currentSpotIds];
      console.log("New spotIdBuffer:", spotIdBuffer);
    }
    lastSpotTime = currentTime;

    setTimeout(async () => {
      if (spotBuffer.length > 0 && (Date.now() - lastSpotTime) >= BUFFER_WINDOW) {
        try {
          await processAlgorandTransaction([...spotIdBuffer], [...spotBuffer]);
        } catch (error) {
          console.error('Error processing Algorand transaction in timeout:', error);
        }
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