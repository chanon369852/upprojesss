import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { query } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { listLeads } from '../controllers/crm.controller';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/crm/leads:
 *   get:
 *     summary: List CRM leads
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by lead status (e.g. new, contacted, converted)
 *       - in: query
 *         name: stage
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by CRM pipeline stage
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *         description: Page size
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 10000
 *         description: Offset pagination
 *     responses:
 *       200:
 *         description: Leads list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrmLeadsResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get(
  '/leads',
  [
    query('status').optional().isString(),
    query('stage').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0, max: 10_000 }),
  ],
  validate,
  asyncHandler(listLeads),
);

export default router;
