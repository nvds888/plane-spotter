const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { spawn } = require('child_process');
const path = require('path');

// Helper function to create Algorand wallet
const createAlgorandWallet = () => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [path.join(__dirname, '../create_wallet.py')]);
    
    let result = '';
    
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to create Algorand wallet'));
        return;
      }
      
      try {
        const walletData = JSON.parse(result);
        if (!walletData.success) {
          reject(new Error(walletData.error || 'Failed to create Algorand wallet'));
          return;
        }
        resolve(walletData.address);
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Register a new user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
  
    try {
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username, email and password are required'
        });
      }

      // Check username format
      if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{1,12}$/.test(username)) {
        return res.status(400).json({
          success: false,
          error: 'Username must be max 12 characters and contain at least one letter and one number'
        });
      }

      // Check if username exists
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }

      // Check if email exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }

      // Create Algorand wallet
      const algorandAddress = await createAlgorandWallet();
  
      // Create user with Algorand address
      const user = await User.create({ 
        username, 
        email, 
        password,
        algorandAddress 
      });

      res.status(201).json({
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role || 'user',
          createdAt: user.createdAt
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to register user'
      });
    }
});

module.exports = router;