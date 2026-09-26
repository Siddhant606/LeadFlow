import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import { emailTemplateSchema, pipelineStageSchema } from '../validators/settings.validator';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);

// Pipeline Stages
router.get('/stages', SettingsController.getStages);
router.put(
  '/stages/:id',
  requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN'),
  validate(pipelineStageSchema),
  SettingsController.updateStage
);

// Email Templates
router.get('/email-templates', SettingsController.getEmailTemplates);
router.post(
  '/email-templates',
  requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN'),
  validate(emailTemplateSchema),
  SettingsController.createEmailTemplate
);
router.put(
  '/email-templates/:id',
  requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN'),
  validate(emailTemplateSchema),
  SettingsController.updateEmailTemplate
);
router.delete(
  '/email-templates/:id',
  requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN'),
  SettingsController.deleteEmailTemplate
);

export default router;
