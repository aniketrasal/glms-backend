import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[GLMS DB] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[GLMS DB] MongoDB connection warning: ${error.message}. Running in mock/standalone mode.`);
  }
};
