const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { spawn } = require('child_process');
const path = require('path');

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  '3': { price: 15, duration: 90 },   // 3 months in days
  '6': { price: 25, duration: 180 },  // 6 months in days
  '12': { price: 40, duration: 365 }  // 12 months in days
};

// Helper to create USDC payment transaction
async function createPaymentTransaction(walletAddress, amount) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../subscription_payment.py');
    const pythonProcess = spawn('python', [
      pythonScript,
      walletAddress,
      amount.toString()
    ]);
    
    pythonProcess.stderr.on('data', (data) => {
      console.error('Python script stderr:', data.toString());
    });
    
    pythonProcess.stdout.on('data', (data) => {
      console.log('Python script stdout:', data.toString());
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(resultData);
          if (!result.success) {
            reject(new Error(result.error || 'Failed to create payment transaction'));
            return;
          }
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

// Helper to verify payment transaction
async function verifyPayment(txId) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../scripts/subscription_payment.py');
    const pythonProcess = spawn('python', [
      pythonScript,
      txId
    ]);

    let resultData = '';

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Payment verification error:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(resultData);
          resolve(result);
        } catch (err) {
          reject(new Error('Failed to parse verification result'));
        }
      } else {
        reject(new Error(`Verification process exited with code ${code}`));
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
    
    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'Failed to create payment transaction');
    }
    
    // Store pending subscription in the user document
    await User.findByIdAndUpdate(userId, {
      'subscription.pending': {
        plan: duration,
        walletAddress,
        amount,
        createdAt: new Date()
      }
    });

    // Return transaction for signing
    res.json({
      txnGroups: [{
        txn: paymentResult.txn,
        signers: [walletAddress]
      }]
    });

  } catch (error) {
    console.error('Error initiating subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate subscription' });
  }
});

// Route to confirm subscription
router.post('/confirm', async (req, res) => {
  try {
    const { userId, duration, txId, walletAddress } = req.body;
    
    // Verify user and pending subscription
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pendingSubscription = user.subscription?.pending;
    if (!pendingSubscription || pendingSubscription.walletAddress !== walletAddress) {
      return res.status(400).json({ error: 'Invalid or expired subscription request' });
    }

    // Verify the payment transaction
    const verificationResult = await verifyPayment(txId);
    if (!verificationResult.success) {
      return res.status(400).json({ 
        error: verificationResult.error || 'Payment verification failed' 
      });
    }

    // Verify payment amount matches subscription plan
    const expectedAmount = SUBSCRIPTION_PLANS[duration].price;
    if (verificationResult.amount !== expectedAmount) {
      return res.status(400).json({ 
        error: 'Payment amount does not match subscription price' 
      });
    }

    // Calculate subscription end date
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(
      subscriptionEndDate.getDate() + SUBSCRIPTION_PLANS[duration].duration
    );

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
    res.status(500).json({ error: error.message || 'Failed to confirm subscription' });
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

module.exports = router;