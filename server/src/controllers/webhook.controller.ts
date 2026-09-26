import { Request, Response, NextFunction } from 'express';
import { LeadService } from '../services/lead.service';
import { Brokerage } from '../models/Brokerage';
import { config } from '../config/env';
import { UnauthorizedError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * POST /api/webhooks/leads
   * External Lead Ingestion Webhook with API key authentication, idempotency, and normalization.
   */
  static async handleLeadWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const apiKey =
        (req.headers['x-api-key'] as string) ||
        (req.headers['authorization']?.replace('Bearer ', '') as string) ||
        (req.query.apiKey as string);

      if (!apiKey) {
        throw new UnauthorizedError('Missing API key for webhook authentication');
      }

      // 1. Resolve brokerage by brokerage apiKey OR global webhook apiKey + slug
      let brokerage = await Brokerage.findOne({ apiKey, status: 'ACTIVE' });

      if (!brokerage) {
        if (apiKey === config.webhookApiKey) {
          const slug =
            (req.headers['x-brokerage-slug'] as string) ||
            req.body.brokerageSlug ||
            'default';

          brokerage = await Brokerage.findOne({ slug, status: 'ACTIVE' });
          if (!brokerage) {
            // Pick first active brokerage if slug is default
            brokerage = await Brokerage.findOne({ status: 'ACTIVE' });
          }
        }
      }

      if (!brokerage) {
        logger.warn(`Unauthorized webhook attempt with key: ${apiKey.substring(0, 6)}...`);
        throw new UnauthorizedError('Invalid webhook API key or inactive brokerage');
      }

      const { externalId, name, email, phone, source, metadata } = req.body;

      if (!externalId || !name || !email || !phone) {
        throw new BadRequestError('Missing required fields: externalId, name, email, phone');
      }

      const result = await LeadService.processWebhookLead(brokerage._id, {
        externalId,
        name,
        email,
        phone,
        source: source || 'EXTERNAL_WEBHOOK',
        metadata,
      });

      if (result.isDuplicateWebhook) {
        res.status(200).json({
          success: true,
          message: 'Webhook processed: duplicate externalId deduplicated',
          deduplicated: true,
          duplicatePersonDetected: result.duplicatePersonDetected,
          data: result.lead,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Lead ingested successfully',
        deduplicated: false,
        duplicatePersonDetected: result.duplicatePersonDetected,
        data: result.lead,
      });
    } catch (error) {
      next(error);
    }
  }
}
