import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { getSeoDashboard, getSeoOverview } from '../controllers/seo.controller';

// FLOW START: SEO Routes (EN)
// จุดเริ่มต้น: Routes ของ SEO (TH)

const router = Router();

router.use(authenticate);

// GET /api/v1/seo/overview - Aggregate SEO overview (GA4 + GSC)
/**
 * @swagger
 * /api/v1/seo/overview:
 *   get:
 *     summary: SEO overview (GA4 + GSC aggregated)
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: SEO overview payload
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
    query('dateFrom').optional().isISO8601().withMessage('Invalid dateFrom'),
    query('dateTo').optional().isISO8601().withMessage('Invalid dateTo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  ],
  validate,
  getSeoOverview,
);

/**
 * @swagger
 * /api/v1/seo/dashboard:
 *   get:
 *     summary: SEO dashboard (full payload for SEO section)
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: SEO dashboard payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SeoDashboardResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get(
  '/dashboard',
  [
    query('dateFrom').optional().isISO8601().withMessage('Invalid dateFrom'),
    query('dateTo').optional().isISO8601().withMessage('Invalid dateTo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  ],
  validate,
  getSeoDashboard,
);

// FLOW END: SEO Routes (EN)
// จุดสิ้นสุด: Routes ของ SEO (TH)

export default router;
