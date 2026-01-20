import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyRole, requirePermission } from '../middleware/tenant.middleware';
import { PERMISSIONS } from '../constants/rbac';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/settings/json-imports:
 *   get:
 *     summary: List JSON imports stored in tenant settings
 *     description: |
 *       Returns a list of JSON import entries stored per tenant (workspace).
 *       Each entry is stored in `tenant_settings` under a key prefix `json_import:`.
 *
 *       Notes:
 *       - Tenant context is normally derived from JWT.
 *       - `x-tenant-id` may be supplied for explicit tenant context (super_admin override / debugging).
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     responses:
 *       200:
 *         description: List of saved JSON imports
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JsonImportListResponse'
 */
router.get(
  '/json-imports',
  requirePermission(PERMISSIONS.manage_integrations),
  asyncHandler(settingsController.listJsonImports),
);

router.get(
  '/pending/json-imports',
  requireAnyRole(['admintest', 'admin_full', 'super_admin']),
  asyncHandler(settingsController.listPendingJsonImports),
);

/**
 * @swagger
 * /api/v1/settings/json-imports/{id}:
 *   get:
 *     summary: Get a JSON import by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: JSON import item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JsonImportGetResponse'
 *       404:
 *         description: Not found
 */
router.get(
  '/json-imports/:id',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(settingsController.getJsonImportById),
);

router.get(
  '/pending/json-imports/:id',
  requireAnyRole(['admintest', 'admin_full', 'super_admin']),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(settingsController.getPendingJsonImportById),
);

/**
 * @swagger
 * /api/v1/settings/json-imports:
 *   post:
 *     summary: Upload/save a JSON import into tenant settings
 *     description: |
 *       Stores arbitrary JSON into `tenant_settings` so it can be referenced later.
 *       Backend validates that `data` is a JSON object or array.
 *
 *       Stored format (value):
 *       - `name` (optional)
 *       - `data` (original JSON)
 *       - `importedAt` (ISO timestamp)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JsonImportCreateRequest'
 *           examples:
 *             SimpleObject:
 *               summary: Upload a simple object
 *               value:
 *                 name: sample.json
 *                 data:
 *                   apiKey: "abc"
 *                   project: "demo"
 *             Array:
 *               summary: Upload an array payload
 *               value:
 *                 name: list.json
 *                 data:
 *                   - id: 1
 *                     name: "A"
 *                   - id: 2
 *                     name: "B"
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JsonImportCreateResponse'
 *       400:
 *         description: Validation error
 */
router.post(
  '/json-imports',
  requirePermission(PERMISSIONS.manage_integrations),
  body('name').optional().isString().isLength({ max: 100 }),
  body('data').custom((value) => value !== undefined),
  validate,
  asyncHandler(settingsController.createJsonImport),
);

router.post(
  '/pending/json-imports',
  requireAnyRole(['admintest', 'admin_full', 'super_admin']),
  body('name').optional().isString().isLength({ max: 100 }),
  body('data').custom((value) => value !== undefined),
  validate,
  asyncHandler(settingsController.createPendingJsonImport),
);

/**
 * @swagger
 * /api/v1/settings/json-imports/{id}:
 *   delete:
 *     summary: Delete a JSON import entry
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JsonImportDeleteResponse'
 *       404:
 *         description: Not found
 */
router.delete(
  '/json-imports/:id',
  requirePermission(PERMISSIONS.manage_integrations),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(settingsController.deleteJsonImport),
);

router.delete(
  '/pending/json-imports/:id',
  requireAnyRole(['admintest', 'admin_full', 'super_admin']),
  param('id').isString().notEmpty(),
  validate,
  asyncHandler(settingsController.deletePendingJsonImport),
);

export default router;
