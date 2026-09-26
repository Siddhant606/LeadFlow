import { Worker, Job } from 'bullmq';
import { getRedisConnectionConfig } from '../config/redis';
import { DocumentModel } from '../models/Document';
import { DocumentVerificationJobData } from '../queues/document.queue';
import { emitToTenant, emitToClient } from '../sockets';
import { logger } from '../utils/logger';

export function createDocumentWorker(): Worker<DocumentVerificationJobData> {
  const workerPromise = (async () => {
    const redisOptions = await getRedisConnectionConfig();
    const worker = new Worker<DocumentVerificationJobData>(
      'document-verification',
      async (job: Job<DocumentVerificationJobData>) => {
        const { documentId, brokerageId, clientId, originalName } = job.data;
        logger.info(
          `[Worker] Processing document ${documentId} ("${originalName}") - Attempt ${job.attemptsMade + 1}`
        );

        // 1. Set status to PROCESSING
        const doc = await DocumentModel.findById(documentId);
        if (!doc) {
          logger.warn(`[Worker] Document not found: ${documentId}`);
          return;
        }

        doc.status = 'PROCESSING';
        await doc.save();

        emitToTenant(brokerageId, 'document:updated', doc);
        emitToClient(clientId, 'document:updated', doc);

        // 2. Worker retry simulation: if filename contains "retry-test" and attemptsMade === 0, throw error
        if (originalName.toLowerCase().includes('retry-test') && job.attemptsMade === 0) {
          logger.warn(
            `[Worker] Simulating temporary worker failure on attempt ${job.attemptsMade + 1} to test BullMQ retry!`
          );
          throw new Error('Simulated transient worker OCR timeout');
        }

        // 3. Simulated slow asynchronous validation (e.g. 2000ms delay)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 4. Failure scenario simulation: if filename contains "fail" or "corrupt" or "reject"
        const shouldFail =
          originalName.toLowerCase().includes('fail') ||
          originalName.toLowerCase().includes('corrupt') ||
          originalName.toLowerCase().includes('reject');

        if (shouldFail) {
          doc.status = 'FAILED';
          doc.failureReason =
            'Document verification failed: Illegible scan, salary statement incomplete or German mortgage notary stamp missing.';
          doc.verificationDetails = {
            ocrPassed: false,
            confidenceScore: 0.32,
            verifiedAt: new Date(),
          };
          logger.warn(`[Worker] Document ${documentId} verification FAILED: ${doc.failureReason}`);
        } else {
          doc.status = 'PASSED';
          doc.failureReason = undefined;
          doc.verificationDetails = {
            ocrPassed: true,
            confidenceScore: 0.97,
            verifiedFields: [
              'Applicant Full Name',
              'Gross / Net Monthly Salary',
              'Employer Name & Tax ID',
              'Bank Account IBAN',
            ],
            verifiedAt: new Date(),
          };
          logger.info(`[Worker] Document ${documentId} verification PASSED`);
        }

        await doc.save();

        // 5. Emit live updates to both Advisor/Tenant room and Client portal room
        emitToTenant(brokerageId, 'document:updated', doc);
        emitToClient(clientId, 'document:updated', doc);

        return { status: doc.status, documentId: doc._id };
      },
      {
        connection: redisOptions,
        concurrency: 5,
      }
    );

    worker.on('completed', (job) => {
      logger.info(`[Worker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
    });

    return worker;
  })();

  return workerPromise as any;
}
