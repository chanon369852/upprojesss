import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireAnyRole } from '../middleware/tenant.middleware';
import * as supportController from '../controllers/support.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireAnyRole(['super_admin', 'admin_full']), asyncHandler(supportController.getSupportStatus));

router.get(
  '/requests',
  requireAnyRole(['super_admin']),
  asyncHandler(supportController.listSupportRequests),
);

router.post(
  '/request',
  requireAnyRole(['admin_full']),
  asyncHandler(supportController.requestSupport),
);

router.post(
  '/revoke',
  requireAnyRole(['admin_full']),
  asyncHandler(supportController.revokeSupport),
);

router.post(
  '/approve/:tenantId',
  requireAnyRole(['super_admin']),
  asyncHandler(supportController.approveSupport),
);

router.post(
  '/deny/:tenantId',
  requireAnyRole(['super_admin']),
  asyncHandler(supportController.denySupport),
);

export default router;
