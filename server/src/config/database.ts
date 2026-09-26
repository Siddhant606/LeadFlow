import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB Disconnected');
}
