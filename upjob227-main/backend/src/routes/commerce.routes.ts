import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { getProductPerformance, getCommerceOverview } from '../controllers/commerce.controller';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/commerce/overview:
 *   get:
 *     summary: Commerce overview (realtime KPIs, profitability, funnel, trends, creatives, videos)
 *     tags: [Commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 365d]
 *         description: Period shortcut
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom startDate (overrides period)
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom endDate (overrides period)
 *     responses:
 *       200:
 *         description: Commerce overview payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommerceOverviewResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get(
  '/overview',
  [
    query('period').optional().isIn(['7d', '30d', '90d', '365d']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validate,
  asyncHandler(getCommerceOverview),
);

/**
 * @swagger
 * /api/v1/commerce/products/performance:
 *   get:
 *     summary: Product performance (aggregated by product metadata)
 *     tags: [Commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 365d]
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Product performance table
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductPerformanceResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get(
  '/products/performance',
  [
    query('period').optional().isIn(['7d', '30d', '90d', '365d']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validate,
  asyncHandler(getProductPerformance),
);

export default router;
