import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyRole } from '../middleware/tenant.middleware';
import * as mockController from '../controllers/mock.controller';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.middleware';

// FLOW START: Mock Routes (EN)
// จุดเริ่มต้น: Routes ของ Mock Data (TH)

const router = Router();

router.use(authenticate);

router.post(
  '/generate',
  body('providers').optional().isArray(),
  body('lookbackDays').optional().isInt({ min: 1, max: 365 }),
  validate,
  asyncHandler(mockController.generateMockData),
);

router.post(
  '/seed-all',
  body('providers').optional().isArray(),
  body('lookbackDays').optional().isInt({ min: 1, max: 365 }),
  body('force').optional().isBoolean(),
  validate,
  asyncHandler(mockController.seedAllMockData),
);

router.get(
  '/metrics',
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  query('platform').optional().isString(),
  validate,
  asyncHandler(mockController.getMockMetrics),
);

router.get(
  '/campaigns',
  query('platform').optional().isString(),
  validate,
  asyncHandler(mockController.getMockCampaigns),
);

router.post(
  '/seed-test-accounts',
  requireAnyRole(['super_admin']),
  body('seedSampleData').optional().isBoolean(),
  body('superAdminEmail').optional().isEmail(),
  body('superAdminPassword').optional().isString().isLength({ min: 6, max: 100 }),
  body('adminTestEmail').optional().isEmail(),
  body('adminTestPassword').optional().isString().isLength({ min: 6, max: 100 }),
  validate,
  asyncHandler(mockController.seedTestAccounts),
);

// FLOW END: Mock Routes (EN)
// จุดสิ้นสุด: Routes ของ Mock Data (TH)

export default router;
