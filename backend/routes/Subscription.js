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

// Route to confirm subscription
router.post('/confirm', async (req, res) => {
  try {
    const { userId, duration, txId, walletAddress } = req.body;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify subscription plan
    if (!SUBSCRIPTION_PLANS[duration]) {
      return res.status(400).json({ error: 'Invalid subscription duration' });
    }

    // Initialize Algorand client
    const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_ADDRESS);

    // Wait for transaction confirmation
    const txInfo = await algosdk.waitForConfirmation(algodClient, txId, 4);
    
    // Verify it's an asset transfer transaction
    if (!txInfo['asset-transfer-transaction']) {
      return res.status(400).json({ error: 'Not an asset transfer transaction' });
    }
    
    const transfer = txInfo['asset-transfer-transaction'];
    
    // Verify it's a USDC transfer to the merchant
    if (transfer['asset-id'] !== parseInt(USDC_ASSET_ID)) {
      return res.status(400).json({ error: 'Not a USDC transfer' });
    }
    
    if (transfer['receiver'] !== MERCHANT_ADDRESS) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    // Verify payment amount matches subscription plan
    const amount = transfer['amount'] / 1_000_000; // Convert from microUSDC to USD
    const expectedAmount = SUBSCRIPTION_PLANS[duration].price;
    if (amount !== expectedAmount) {
      return res.status(400).json({ error: 'Payment amount does not match subscription price' });
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
        'subscription.walletAddress': walletAddress
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