const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const userRoutes = require('./routes/User');
require('dotenv').config();

const app = express();



// CORS middleware should be before routes
app.use(cors({
  origin: 'https://plane-spotter-frontend.vercel.app', // Update this to your Vercel frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes (AFTER CORS and middleware)
app.use('/api/auth', authRoutes);

app.use('/api/flights', flightRoutes);


app.use('/api/user', userRoutes);

const spotRoutes = require('./routes/Spot');
app.use('/api/spot', spotRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on https://plane-spotter-backend.onrender.com`);
});