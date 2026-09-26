import { Queue } from 'bullmq';
import { getRedisConnectionConfig } from '../config/redis';
import { logger } from '../utils/logger';

export interface DocumentVerificationJobData {
  documentId: string;
  brokerageId: string;
  clientId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
}

let documentQueue: Queue<DocumentVerificationJobData> | null = null;

export async function getDocumentQueue(): Promise<Queue<DocumentVerificationJobData>> {
  if (!documentQueue) {
    const redisOptions = await getRedisConnectionConfig();
    documentQueue = new Queue<DocumentVerificationJobData>('document-verification', {
      connection: redisOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1500,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    documentQueue.on('error', (err) => {
      logger.error('DocumentQueue error:', err.message);
    });

    logger.info('Document verification queue initialized');
  }
  return documentQueue;
}

export async function queueDocumentVerification(data: DocumentVerificationJobData): Promise<void> {
  const queue = await getDocumentQueue();
  await queue.add('verify-document', data, {
    jobId: `doc-${data.documentId}`,
  });
  logger.info(`Queued document verification job for documentId: ${data.documentId}`);
}
