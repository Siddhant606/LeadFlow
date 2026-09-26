import http from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initRedis, closeRedis } from './config/redis';
import { initSocketIO } from './sockets';
import { createDocumentWorker } from './workers/document.worker';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    logger.info('Initializing LeadFlow Backend Services...');

    // 1. Connect MongoDB
    await connectDatabase();

    // 2. Initialize Redis (with auto fallback to embedded memory server if standalone is offline)
    await initRedis();

    // 3. Initialize Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 4. Initialize Socket.IO
    initSocketIO(server);

    // 5. Initialize BullMQ Document Worker in-process for seamless local dev & demo
    createDocumentWorker();

    // 6. Listen
    server.listen(config.port, () => {
      logger.info(`LeadFlow API Server running on port ${config.port} (${config.nodeEnv})`);
      logger.info(`Client origin allowed: ${config.clientUrl}`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await disconnectDatabase();
        await closeRedis();
        logger.info('LeadFlow server stopped gracefully.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Fatal error during server bootstrap:', error);
    process.exit(1);
  }
}

bootstrap();
