import { Router } from 'express';
import authRoutes from './auth.routes';
import webhookRoutes from './webhook.routes';
import leadRoutes from './lead.routes';
import clientRoutes from './client.routes';
import documentRoutes from './document.routes';
import taskRoutes from './task.routes';
import dashboardRoutes from './dashboard.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/leads', leadRoutes);
router.use('/clients', clientRoutes);
router.use('/documents', documentRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'leadflow-api',
    timestamp: new Date().toISOString(),
  });
});

export default router;
