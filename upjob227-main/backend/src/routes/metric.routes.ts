import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import * as metricController from '../controllers/metric.controller';

// FLOW START: Metrics Routes (EN)
// จุดเริ่มต้น: Routes ของ Metrics (TH)

const router = Router();

router.use(authenticate);

// Metrics
/**
 * @swagger
 * /api/v1/metrics/overview:
 *   get:
 *     summary: Get overview metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     responses:
 *       200:
 *         description: Overview metrics payload
 */
router.get('/overview', asyncHandler(metricController.getOverview));

/**
 * @swagger
 * /api/v1/metrics/dashboard:
 *   get:
 *     summary: Get dashboard metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d, 365d]
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
 *         description: Dashboard metrics payload
 */
router.get('/dashboard', asyncHandler(metricController.getDashboardData));

/**
 * @swagger
 * /api/v1/metrics/platform-breakdown:
 *   get:
 *     summary: Get platform breakdown metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     responses:
 *       200:
 *         description: Platform breakdown metrics payload
 */
router.get('/platform-breakdown', asyncHandler(metricController.getPlatformBreakdown));

/**
 * @swagger
 * /api/v1/metrics/snapshots:
 *   get:
 *     summary: Get snapshots metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     responses:
 *       200:
 *         description: Snapshots metrics payload
 */
router.get('/snapshots', asyncHandler(metricController.getCachedSnapshots));

/**
 * @swagger
 * /api/v1/metrics/trends:
 *   get:
 *     summary: Get metric trend series (time-series)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     responses:
 *       200:
 *         description: Trend series payload
 */
router.get('/trends', asyncHandler(metricController.getTrends));

/**
 * @swagger
 * /api/v1/metrics/comparison:
 *   get:
 *     summary: Compare metrics (current vs previous)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     responses:
 *       200:
 *         description: Comparison payload
 */
router.get('/comparison', asyncHandler(metricController.getComparison));

/**
 * @swagger
 * /api/v1/metrics/bulk:
 *   post:
 *     summary: Bulk create metrics rows (ingestion/debug)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               additionalProperties: true
 *     responses:
 *       200:
 *         description: Bulk insert result
 */
router.post('/bulk', asyncHandler(metricController.bulkCreateMetrics));

// FLOW END: Metrics Routes (EN)
// จุดสิ้นสุด: Routes ของ Metrics (TH)

export default router;
