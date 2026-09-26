import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadflow',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  jwtSecret: process.env.JWT_SECRET || 'leadflow-dev-secret-key-mortgage-saas-2025',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  webhookApiKey: process.env.WEBHOOK_API_KEY || 'lf_webhook_secret_key_89741b2c349',
  storageDir: process.env.STORAGE_DIR || path.resolve(__dirname, '../../uploads'),
  emailProvider: process.env.EMAIL_PROVIDER || 'console',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'LeadFlow <noreply@leadflow.de>',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
