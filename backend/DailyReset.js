// dailyReset.js (place this in your backend routes directory)
const cron = require('node-cron');
const User = require('../models/User');


const initializeDailyReset = () => {
  console.log('Initializing daily spot reset scheduler...');
  
  cron.schedule('0 0 * * *', async () => {
    console.log('Starting daily spot reset...');
    try {
      const result = await User.updateMany(
        { premium: false },
        { 
          $set: { 
            spotsRemaining: 4,
            lastDailyReset: new Date()
          }
        }
      );
      console.log('Daily spot reset completed:', result);
    } catch (error) {
      console.error('Error in daily spot reset:', error);
    }
  }, {
    timezone: 'UTC'
  });
};

// Manual trigger function for testing/admin use
const triggerManualReset = async () => {
  console.log('Triggering manual spot reset...');
  try {
    const result = await User.updateMany(
      { premium: false },
      { 
        $set: { 
          spotsRemaining: 4,
          lastDailyReset: new Date()
        }
      }
    );
    console.log('Manual spot reset completed:', result);
    return result;
  } catch (error) {
    console.error('Error in manual spot reset:', error);
    throw error;
  }
};

module.exports = {
  initializeDailyReset,
  triggerManualReset
};