const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const User = require('../models/User');
const mongoose = require('mongoose');
const { getBestAirlineName } = require('../utils/airlineMapping');
const { getAirportName } = require('../utils/airportMapping');
const { updateStreak } = require('./badgesprofile');  
const cron = require('node-cron');

let spotBuffer = [];
let spotIdBuffer = [];
let lastSpotTime = null;
const BUFFER_WINDOW = 1000; // 1 second window to collect flights from same spot

class SpotResetManager {
  constructor() {
    this.initializeCronJob();
  }

  initializeCronJob() {
    // Run at midnight UTC
    cron.schedule('0 0 * * *', async () => {
      try {
        const now = new Date();
        // Reset all non-premium users to 4 spots
        await User.updateMany(
          { premium: false },
          { 
            $set: { 
              spotsRemaining: 4,
              lastDailyReset: now
            }
          }
        );
        console.log('Daily spot reset completed at:', now);
      } catch (error) {
        console.error('Error in daily spot reset:', error);
      }
    }, {
      timezone: 'UTC'
    });
  }
}

new SpotResetManager();

const typeMapping = {
  // Airbus Family
  'A20N': 'A320neo',
  'A21N': 'A321neo',
  'A318': 'A318',
  'A319': 'A319',
  'A320': 'A320',
  'A321': 'A321',
  'A332': 'A330-200',
  'A333': 'A330-300',
  'A338': 'A330-800neo',
  'A339': 'A330-900neo',
  'A342': 'A340-200',
  'A343': 'A340-300',
  'A345': 'A340-500',
  'A346': 'A340-600',
  'A359': 'A350-900',
  'A35K': 'A350-1000',
  'A388': 'A380-800',

  // Boeing Family
  'B731': 'B737-100',
  'B732': 'B737-200',
  'B733': 'B737-300',
  'B734': 'B737-400',
  'B735': 'B737-500',
  'B736': 'B737-600',
  'B737': 'B737',
  'B738': 'B737-800',
  'B739': 'B737-900',
  'B37M': 'B737 MAX 7',
  'B38M': 'B737 MAX 8',
  'B39M': 'B737 MAX 9',
  'B3XM': 'B737 MAX 10',
  'B741': 'B747-100',
  'B742': 'B747-200',
  'B743': 'B747-300',
  'B744': 'B747-400',
  'B748': 'B747-8',
  'B752': 'B757-200',
  'B753': 'B757-300',
  'B762': 'B767-200',
  'B763': 'B767-300',
  'B764': 'B767-400',
  'B772': 'B777-200',
  'B77L': 'B777-200LR',
  'B773': 'B777-300',
  'B77W': 'B777-300ER',
  'B778': 'B777-8',
  'B779': 'B777-9',
  'B788': 'B787-8',
  'B789': 'B787-9',
  'B78X': 'B787-10',

  // Embraer Commercial
  'E170': 'Embraer E170',
  'E175': 'Embraer E175',
  'E190': 'Embraer E190',
  'E195': 'Embraer E195',
  'E290': 'Embraer E190-E2',
  'E295': 'Embraer E195-E2',

  // Bombardier/Airbus (C Series)
  'BCS1': 'Airbus A220-100',
  'BCS3': 'Airbus A220-300',
  'CS100': 'Airbus A220-100',
  'CS300': 'Airbus A220-300',

  // ATR Aircraft
  'AT43': 'ATR 42-300',
  'AT45': 'ATR 42-500',
  'AT46': 'ATR 42-600',
  'AT72': 'ATR 72-200',
  'AT75': 'ATR 72-500',
  'AT76': 'ATR 72-600',

  // Bombardier Dash/Q Series
  'DH8A': 'Dash 8-100',
  'DH8B': 'Dash 8-200',
  'DH8C': 'Dash 8-300',
  'DH8D': 'Dash 8-400',

  // CRJ Series
  'CRJ1': 'Bombardier CRJ100',
  'CRJ2': 'Bombardier CRJ200',
  'CRJ7': 'Bombardier CRJ700',
  'CRJ9': 'Bombardier CRJ900',
  'CRJX': 'Bombardier CRJ1000',

  // McDonnell Douglas (Legacy)
  'MD11': 'McDonnell Douglas MD-11',
  'MD80': 'McDonnell Douglas MD-80',
  'MD82': 'McDonnell Douglas MD-82',
  'MD83': 'McDonnell Douglas MD-83',
  'MD87': 'McDonnell Douglas MD-87',
  'MD88': 'McDonnell Douglas MD-88',
  'MD90': 'McDonnell Douglas MD-90',

  // Fokker
  'F70': 'Fokker 70',
  'F100': 'Fokker 100',

  // British Aerospace
  'BA46': 'BAe 146',
  'RJ85': 'Avro RJ85',
  'RJ1H': 'Avro RJ100',

  // Antonov
  'A124': 'Antonov An-124',
  'A225': 'Antonov An-225',

  // Sukhoi
  'SU95': 'Sukhoi Superjet 100',
  
  // COMAC
  'C919': 'COMAC C919',
  'ARJ21': 'COMAC ARJ21'
};

const mapSpotToFrontend = (spot) => {
  const spotObj = spot.toObject ? spot.toObject() : spot;
  const flightType = spotObj.flight?.type || 'N/A';

  return {
    ...spotObj,
    flight: {
      hex: spotObj.flight?.system?.hex || 'N/A',
      flight: spotObj.flight?.flight || 'N/A',
      type: spotObj.flight?.type || 'N/A',
      typeName: typeMapping[flightType] || flightType,
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

    // Check spot limit for non-premium users
    if (!user.premium && user.spotsRemaining <= 0) {
      return res.status(403).json({ 
        error: 'Daily spot limit reached',
        nextResetTime: user.lastDailyReset
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
      baseXP: req.body.isTeleport ? 10 : 5,
      isTeleport: req.body.isTeleport || false,
      location: req.body.location || null,
      timestamp: now
    };

    const spot = await Spot.create(spotData);
    await spot.save();
    console.log('Spot created:', spot._id);

    await updateStreak(user, now);
    await user.save();
    console.log("Spot created and saved:", spot);
    currentSpotIds.push(spot._id);

    // Update user XP and decrease spots remaining by EXACTLY 1
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

    console.log('User updated after spot creation:', {
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