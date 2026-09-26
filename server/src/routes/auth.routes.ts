import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate, requireRole } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { loginSchema, registerBrokerageSchema, createUserSchema } from '../validators/auth.validator';

const router = Router();

router.post('/login', validate(loginSchema), AuthController.login);
router.post('/register', validate(registerBrokerageSchema), AuthController.registerBrokerage);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.get('/advisors', authenticate, enforceTenant, AuthController.getAdvisors);
router.post(
  '/users',
  authenticate,
  enforceTenant,
  requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN'),
  validate(createUserSchema),
  AuthController.createUser
);

export default router;
