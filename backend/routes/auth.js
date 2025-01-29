const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

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
  
      const user = await User.create({ username, email, password });
      res.status(201).json({
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role || 'user'
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to register user'
      });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
      const { login, password } = req.body; // login can be email or username

      if (!login || !password) {
        return res.status(400).json({
          success: false,
          error: 'Login credentials and password are required'
        });
      }

      // Find user by email or username
      const user = await User.findOne({
        $or: [
          { email: login },
          { username: login }
        ]
      }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
  
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
  
      res.status(200).json({
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role || 'user'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
});

module.exports = router;