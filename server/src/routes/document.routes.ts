import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { documentUpload } from '../services/document.service';
import { authenticate, requireRole } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';

const router = Router();

router.use(authenticate);

// Document upload: allowed for CLIENT, ADVISOR, BROKERAGE_ADMIN
router.post(
  '/upload',
  enforceTenant,
  documentUpload.single('file'),
  DocumentController.uploadDocument
);

// Secure download: tenant & role checks implemented inside handler
router.get('/:id/download', DocumentController.downloadDocument);

// Client-specific document list
router.get('/client/:clientId?', enforceTenant, DocumentController.getClientDocuments);

// Tenant-wide document list (Advisors & Admins only)
router.get(
  '/',
  enforceTenant,
  requireRole('PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR'),
  DocumentController.getTenantDocuments
);

export default router;
