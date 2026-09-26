import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { validate } from '../middleware/validate';
import { webhookLeadSchema } from '../validators/lead.validator';

const router = Router();

// POST /api/webhooks/leads
router.post('/leads', validate(webhookLeadSchema), WebhookController.handleLeadWebhook);

export default router;
