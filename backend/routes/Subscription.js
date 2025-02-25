const express = require('express');
const router = express.Router();
const User = require('../models/User');
const algosdk = require('algosdk');

// Algorand connection details
const ALGOD_ADDRESS = "https://testnet-api.4160.nodely.dev";
const ALGOD_TOKEN = "";
const USDC_ASSET_ID = process.env.USDC_ASSET_ID;
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS;

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  '3': { price: 15, duration: 90 },   // 3 months in days
  '6': { price: 25, duration: 180 },  // 6 months in days
  '12': { price: 40, duration: 365 }  // 12 months in days
};


router.post('/confirm', async (req, res) => {
  try {
    const { userId, duration, txId, walletAddress } = req.body;
    
    console.log(`Starting subscription confirmation for user ${userId}, txId ${txId}`);
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify subscription plan
    if (!SUBSCRIPTION_PLANS[duration]) {
      console.log(`Invalid subscription duration: ${duration}`);
      return res.status(400).json({ error: 'Invalid subscription duration' });
    }

    // Initialize Algorand client
    console.log(`Connecting to Algorand node: ${ALGOD_ADDRESS}`);
    const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_ADDRESS);

    // Wait for transaction confirmation
    console.log(`Waiting for confirmation of transaction: ${txId}`);
    const txInfo = await algosdk.waitForConfirmation(algodClient, txId, 4);
    
    console.log('Transaction confirmed in round:', txInfo.confirmedRound);
    console.log('Transaction type keys:', Object.keys(txInfo));

    // Check if transaction was confirmed - if it has a confirmedRound, it was processed successfully
    if (!txInfo.confirmedRound) {
      console.log('Transaction not confirmed');
      return res.status(400).json({ error: 'Transaction not confirmed' });
    }

    // The transaction is successfully confirmed at this point
    console.log('Transaction confirmed - activating subscription');
    
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
        'subscription.walletAddress': walletAddress
      }
    });

    console.log(`Subscription confirmed for user ${userId} until ${subscriptionEndDate}`);
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