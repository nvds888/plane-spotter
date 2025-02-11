const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const userRoutes = require('./routes/User');
const achievementsRouter = require('./routes/achievements');
const friendRoutes = require('./routes/friends');
const badgesprofileRoutes = require('./routes/badgesprofile');
const locationStatsRoutes = require('./routes/locationStats');
require('dotenv').config();

const app = express();

// CORS middleware
app.use(cors({
  origin: 'https://plane-spotter-frontend.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/user', friendRoutes);

app.use('/api/location-stats', locationStatsRoutes);

app.use('/api/achievements', achievementsRouter);

app.use('/badges', require('./routes/badgesprofile').router);

// Test endpoint for MongoDB connection
app.get('/api/test-db', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      state: stateMap[state],
      host: mongoose.connection.host || 'No host found',
      isConnected: state === 1
    });
  } catch (error) {
    console.error('DB Test Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// MongoDB connection with improved settings
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(() => console.log('Connected to MongoDB!'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);  // Exit if cannot connect to database
});

// MongoDB connection event handlers
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.once('open', () => {
  console.log('MongoDB connection established successfully');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/user', userRoutes);

const spotRoutes = require('./routes/Spot');
app.use('/api/spot', spotRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});