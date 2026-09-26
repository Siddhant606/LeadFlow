import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);
router.use(requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR'));

router.get('/stats', DashboardController.getStats);

export default router;
