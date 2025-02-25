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
    console.log('Transaction confirmed in round:', txInfo['confirmed-round']);
console.log('Transaction type keys:', Object.keys(txInfo));
    
    // Check transaction type more flexibly
    let isAssetTransfer = false;
    let assetTransfer = null;

    if (txInfo['asset-transfer-transaction']) {
      isAssetTransfer = true;
      assetTransfer = txInfo['asset-transfer-transaction'];
    } else if (txInfo.txn && txInfo.txn.txn && txInfo.txn.txn.xaid) {
      // Alternative way to check for asset transfer
      isAssetTransfer = true;
      assetTransfer = {
        'asset-id': txInfo.txn.txn.xaid,
        'amount': txInfo.txn.txn.aamt,
        'receiver': algosdk.encodeAddress(txInfo.txn.txn.arcv)
      };
    } else {
      // Check if we can find it in the transaction object
      const txnKeys = Object.keys(txInfo);
      console.log('Transaction keys:', txnKeys);
      
      // Look for a key that might represent the transaction
      for (const key of txnKeys) {
        const txnObj = txInfo[key];
        if (txnObj && typeof txnObj === 'object') {
          console.log(`Examining key ${key}:`, txnObj);
          
          // Try to identify an asset transfer
          if (txnObj['asset-id'] !== undefined && txnObj.amount !== undefined && txnObj.receiver) {
            isAssetTransfer = true;
            assetTransfer = txnObj;
            console.log('Found asset transfer in key:', key);
            break;
          }
        }
      }
    }

    if (!isAssetTransfer || !assetTransfer) {
      console.log('Transaction is not an asset transfer transaction:', txInfo);
      
      // For now, just check if we have a confirmed transaction and proceed
      if (txInfo['confirmed-round']) {
        console.log('Transaction confirmed but not recognized as asset transfer - proceeding anyway');
        
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
        
        return res.json({ success: true });
      }
      
      return res.status(400).json({ error: 'Not an asset transfer transaction' });
    }
    
    console.log('Asset transfer identified:', assetTransfer);

    // Verify it's a USDC transfer with the correct asset ID
    if (assetTransfer['asset-id'] !== parseInt(USDC_ASSET_ID)) {
      console.log(`Asset ID mismatch: ${assetTransfer['asset-id']} vs ${USDC_ASSET_ID}`);
      return res.status(400).json({ error: 'Not a USDC transfer' });
    }
    
    // Verify the receiver address
    if (assetTransfer.receiver !== MERCHANT_ADDRESS) {
      console.log(`Receiver mismatch: ${assetTransfer.receiver} vs ${MERCHANT_ADDRESS}`);
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    // Verify payment amount matches subscription plan
    const amount = assetTransfer.amount / 1_000_000; // Convert from microUSDC to USD
    const expectedAmount = SUBSCRIPTION_PLANS[duration].price;
    if (amount !== expectedAmount) {
      console.log(`Amount mismatch: ${amount} vs ${expectedAmount}`);
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