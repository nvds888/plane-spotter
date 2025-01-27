const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


// Register a new user
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
  
      // Remove manual hashing and save the plain password
      const user = await User.create({ email, password }); // Password is hashed in pre-save hook
      res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

// Login user
router.post('/login', async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) return res.status(400).json({ error: "User not found" });
  
      const valid = await bcrypt.compare(req.body.password, user.password);
      if (!valid) return res.status(400).json({ error: "Invalid password" });
  
      // Return EXACTLY this structure
      res.status(200).json({
        id: user._id.toString(), // Must be string
        email: user.email,
        role: user.role || 'user'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

module.exports = router;