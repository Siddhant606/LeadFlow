import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import { updateTaskStatusSchema } from '../validators/task.validator';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);
router.use(requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR'));

router.get('/', TaskController.getTasks);
router.patch('/:id/status', validate(updateTaskStatusSchema), TaskController.updateTaskStatus);

export default router;
