const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { spawn } = require('child_process');

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  '3': { price: 15, duration: 90 },   // 3 months in days
  '6': { price: 25, duration: 180 },  // 6 months in days
  '12': { price: 40, duration: 365 }  // 12 months in days
};

// Helper to create USDC payment transaction
async function createPaymentTransaction(walletAddress, amount) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      'subscription_payment.py',
      walletAddress,
      amount.toString()
    ]);

    let resultData = '';

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Payment processing error:', data.toString());
      reject(new Error(data.toString()));
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(resultData);
          resolve(result);
        } catch (err) {
          reject(new Error('Failed to parse payment result'));
        }
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

// Route to initiate subscription
router.post('/connect-wallet', async (req, res) => {
  try {
    const { userId, duration, amount, walletAddress } = req.body;
    
    // Validate subscription plan
    if (!SUBSCRIPTION_PLANS[duration]) {
      return res.status(400).json({ error: 'Invalid subscription duration' });
    }

    // Verify amount matches plan price
    if (amount !== SUBSCRIPTION_PLANS[duration].price) {
      return res.status(400).json({ error: 'Invalid subscription amount' });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create payment transaction
    const paymentResult = await createPaymentTransaction(walletAddress, amount);
    
    // Store pending subscription in the user document
    await User.findByIdAndUpdate(userId, {
      'subscription.pending': {
        plan: duration,
        walletAddress,
        amount,
        createdAt: new Date()
      }
    });

    // Return transaction details to be signed by wallet
    res.json({
      txnGroups: [{
        txn: paymentResult.txn,
        signers: [walletAddress]
      }]
    });

  } catch (error) {
    console.error('Error initiating subscription:', error);
    res.status(500).json({ error: 'Failed to initiate subscription' });
  }
});

// Webhook route for subscription confirmation
router.post('/confirm', async (req, res) => {
  try {
    const { userId, duration, txId, walletAddress } = req.body;
    
    // Verify user and pending subscription
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.subscription?.pending?.walletAddress === walletAddress) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Verify the payment transaction
    const verificationResult = await verifyPayment(txId);
    if (!verificationResult.success) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Calculate subscription end date
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + SUBSCRIPTION_PLANS[duration].duration);

    // Update user subscription status
    await User.findByIdAndUpdate(userId, {
      premium: true,
      dailySpotLimit: 8,
      spotsRemaining: 8,
      $set: {
        'subscription.active': true,
        'subscription.plan': duration,
        'subscription.startDate': new Date(),
        'subscription.endDate': subscriptionEndDate,
        'subscription.transactionId': txId,
        'subscription.walletAddress': walletAddress,
        'subscription.pending': null
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error confirming subscription:', error);
    res.status(500).json({ error: 'Failed to confirm subscription' });
  }
});

// Route to check subscription status
router.get('/status/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      premium: user.premium,
      subscription: {
        active: user.subscription?.active || false,
        plan: user.subscription?.plan,
        endDate: user.subscription?.endDate,
        isExpired: user.subscription?.endDate ? new Date() > user.subscription.endDate : false
      }
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

// Cron job to check and update expired subscriptions
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    
    // Find and update expired subscriptions
    await User.updateMany(
      {
        premium: true,
        'subscription.endDate': { $lte: now }
      },
      {
        $set: {
          premium: false,
          dailySpotLimit: 4,
          spotsRemaining: 4,
          'subscription.active': false
        }
      }
    );
    
    console.log('Subscription status check completed');
  } catch (error) {
    console.error('Error in subscription status check:', error);
  }
});

module.exports = router;