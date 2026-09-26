import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import {
  createLeadManualSchema,
  updateLeadStageSchema,
  updateLeadSchema,
} from '../validators/lead.validator';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);
router.use(requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR'));

router.get('/', LeadController.getLeads);
router.get('/:id', LeadController.getLeadById);
router.post('/', validate(createLeadManualSchema), LeadController.createLead);
router.patch('/:id/stage', validate(updateLeadStageSchema), LeadController.updateLeadStage);
router.put('/:id', validate(updateLeadSchema), LeadController.updateLead);

export default router;
