import { Router } from 'express';
import { ClientController } from '../controllers/client.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import {
  convertLeadToClientSchema,
  updateClientCaseStatusSchema,
} from '../validators/client.validator';

const router = Router();

router.use(authenticate);

// Client self-service endpoint (for CLIENT role)
router.get('/me', ClientController.getMyClientProfile);

// Brokerage team endpoints
router.use(enforceTenant);
router.use(requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR'));

router.get('/', ClientController.getClients);
router.get('/:id', ClientController.getClientById);
router.post('/convert/:leadId', validate(convertLeadToClientSchema), ClientController.convertLead);
router.patch('/:id/status', validate(updateClientCaseStatusSchema), ClientController.updateCaseStatus);

export default router;
