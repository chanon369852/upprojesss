import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { query } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { getDashboardOverview, getTrendDashboard } from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/dashboard/overview:
 *   get:
 *     summary: Dashboard overview (aggregated KPIs for main dashboard)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *         description: "Range shortcut used by the UI (implementation-defined). Example: 7D, 30D."
 *     responses:
 *       200:
 *         description: Aggregated dashboard overview payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardOverviewResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get(
  '/overview',
  [query('range').optional().isString().withMessage('Invalid range')],
  validate,
  asyncHandler(getDashboardOverview),
);

/**
 * @swagger
 * /api/v1/dashboard/trend:
 *   get:
 *     summary: Trend dashboard (history + retention + lead source breakdown)
 *     tags: [Dashboard]
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
 *         description: Predefined period
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom range start (overrides period)
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom range end (overrides period)
 *     responses:
 *       200:
 *         description: Trend dashboard payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendDashboardResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get(
  '/trend',
  [
    query('period').optional().isIn(['7d', '30d', '90d', '365d']).withMessage('Invalid period'),
    query('startDate').optional().isISO8601().withMessage('Invalid startDate'),
    query('endDate').optional().isISO8601().withMessage('Invalid endDate'),
  ],
  validate,
  asyncHandler(getTrendDashboard),
);

export default router;
