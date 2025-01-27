import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<typeof mongoose> {
    if (cached.conn) return cached.conn;
  
    if (!cached.promise) {
      cached.promise = mongoose.connect(MONGODB_URI, {
        tlsAllowInvalidCertificates: true, // Bypass SSL validation
        serverSelectionTimeoutMS: 5000, // Fail fast if no connection
      });
    }
  
    cached.conn = await cached.promise;
    return cached.conn;
  }

export default dbConnect;