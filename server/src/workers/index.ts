import { connectDatabase } from '../config/database';
import { createDocumentWorker } from './document.worker';
import { logger } from '../utils/logger';

async function startWorkerProcess(): Promise<void> {
  try {
    logger.info('Starting LeadFlow Background Worker process...');
    await connectDatabase();
    createDocumentWorker();
    logger.info('LeadFlow Background Worker running and waiting for jobs.');
  } catch (err) {
    logger.error('Failed to start worker process', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startWorkerProcess();
}
