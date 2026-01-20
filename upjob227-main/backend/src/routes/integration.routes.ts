import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  getIntegrations,
  getIntegrationNotifications,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  syncIntegration,
  syncAllIntegrations,
  testIntegration,
  getSyncHistory,
  getUpgradeStatus,
  setPaymentMethod,
  applyPromoCode,
  requestAdminFullUpgrade,
  getTrialStatus,
  createStripeSetupIntent,
  confirmStripeSetupIntent,
  listPendingIntegrationSetup,
  upsertPendingIntegrationSetup,
  deletePendingIntegrationSetup,
} from '../controllers/integration.controller';
import { requireAnyRole, requirePermission } from '../middleware/tenant.middleware';
import { PERMISSIONS } from '../constants/rbac';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import * as oauthController from '../controllers/oauth.controller';

// FLOW START: Integrations Routes (EN)
// จุดเริ่มต้น: Routes ของ Integrations (TH)

const router = Router();

// OAuth callback endpoints must be public because provider redirects won't include a Bearer token.
router.get('/oauth/callback', asyncHandler(oauthController.handleCallback));
router.get(
  '/:id/oauth/callback',
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(oauthController.handleCallback),
);

router.use(authenticate);

/**
 * @swagger
 * /api/v1/integrations:
 *   get:
 *     summary: List integrations
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integrations list
 */
router.get('/', asyncHandler(getIntegrations));

/**
 * @swagger
 * /api/v1/integrations/notifications:
 *   get:
 *     summary: List integration notifications
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get('/notifications', asyncHandler(getIntegrationNotifications));

router.get('/upgrade-status', asyncHandler(getUpgradeStatus));

router.post(
  '/payment-method',
  body('brand').isString().isLength({ min: 1, max: 30 }),
  body('last4').isString().isLength({ min: 4, max: 4 }),
  validate,
  asyncHandler(setPaymentMethod),
);

router.post('/billing/stripe/setup-intent', asyncHandler(createStripeSetupIntent));

router.post(
  '/billing/stripe/confirm',
  body('setupIntentId').isString().isLength({ min: 5, max: 200 }),
  validate,
  asyncHandler(confirmStripeSetupIntent),
);

router.post(
  '/promo',
  body('code').isString().isLength({ min: 1, max: 50 }),
  validate,
  asyncHandler(applyPromoCode),
);

router.post(
  '/upgrade-request',
  body('message').optional().isString().isLength({ max: 500 }),
  body('contact').optional().isObject(),
  body('contact.name').optional().isString().isLength({ max: 100 }),
  body('contact.phone').optional().isString().isLength({ max: 50 }),
  body('contact.email').optional().isString().isLength({ max: 150 }),
  body('contact.lineId').optional().isString().isLength({ max: 80 }),
  body('contact.note').optional().isString().isLength({ max: 500 }),
  validate,
  asyncHandler(requestAdminFullUpgrade),
);

router.get(
  '/trial-status',
  requireAnyRole(['admintest', 'admin_full', 'super_admin']),
  asyncHandler(getTrialStatus),
);

router.get(
  '/pending/setup',
  requireAnyRole(['admintest', 'admin_full', 'super_admin']),
  asyncHandler(listPendingIntegrationSetup),
);

router.post(
  '/pending/setup',
  requireAnyRole(['admintest', 'admin_full', 'super_admin']),
  body('provider').isString().isLength({ min: 1, max: 50 }),
  body('type').optional().isString().isLength({ min: 1, max: 50 }),
  body('credentials').optional(),
  body('config').optional(),
  validate,
  asyncHandler(upsertPendingIntegrationSetup),
);

router.delete(
  '/pending/setup/:provider',
  requireAnyRole(['admintest', 'admin_full', 'super_admin']),
  param('provider').isString().notEmpty(),
  validate,
  asyncHandler(deletePendingIntegrationSetup),
);

/**
 * @swagger
 * /api/v1/integrations/sync-history:
 *   get:
 *     summary: List integration sync history
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sync history list
 */
router.get(
  '/sync-history',
  requirePermission(PERMISSIONS.manage_integrations),
  query('platform').optional().isString(),
  query('status').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('offset').optional().isInt({ min: 0 }),
  validate,
  asyncHandler(getSyncHistory),
);

router.get('/:id', asyncHandler(getIntegrationById));

router.post(
  '/',
  requirePermission(PERMISSIONS.manage_integrations),
  body().custom((value: any) => {
    const provider = value?.provider;
    const type = value?.type;
    if (typeof provider === 'string' && provider.trim()) return true;
    if (typeof type === 'string' && type.trim()) return true;
    throw new Error('provider or type is required');
  }),
  body('provider').optional().isString().notEmpty(),
  body('type').optional().isString().notEmpty(),
  body('name').optional().isString().notEmpty(),
  body('credentials').optional(),
  body('config').optional(),
  validate,
  asyncHandler(createIntegration),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(updateIntegration),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(deleteIntegration),
);

router.post(
  '/sync-all',
  requirePermission(PERMISSIONS.manage_integrations),
  body('providers').optional().isArray(),
  validate,
  asyncHandler(syncAllIntegrations),
);

router.post(
  '/:id/sync',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(syncIntegration),
);

router.post(
  '/:id/test',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(testIntegration),
);

// OAuth endpoints
router.post(
  '/:id/oauth/start',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(oauthController.startOAuth),
);

router.post(
  '/:id/oauth/refresh',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(oauthController.refreshToken),
);

router.get(
  '/:id/oauth/status',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(oauthController.getOAuthStatus),
);

router.post(
  '/:id/oauth/revoke',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(oauthController.revokeAccess),
);

// FLOW END: Integrations Routes (EN)
// จุดสิ้นสุด: Routes ของ Integrations (TH)

export default router;
