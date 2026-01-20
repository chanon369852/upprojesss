import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import * as campaignController from '../controllers/campaign.controller';

// FLOW START: Campaign Routes (EN)
// จุดเริ่มต้น: Routes ของ Campaign (TH)

const router = Router();

// All routes require authentication
router.use(authenticate);

// Campaign CRUD
/**
 * @swagger
 * /api/v1/campaigns:
 *   get:
 *     summary: List campaigns
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     responses:
 *       200:
 *         description: Campaign list
 */
router.get('/', asyncHandler(campaignController.getCampaigns));

// Campaign Insights (aggregated)
/**
 * @swagger
 * /api/v1/campaigns/insights:
 *   get:
 *     summary: Campaign insights (aggregated by source for dashboard)
 *     tags: [Campaigns]
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
 *         description: Optional period shortcut
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
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *         description: Max campaigns per source (implementation-defined)
 *     responses:
 *       200:
 *         description: Campaign insights by source
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignInsightsResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/insights', asyncHandler(campaignController.getCampaignInsights));

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign
 */
router.get('/:id', asyncHandler(campaignController.getCampaignById));

/**
 * @swagger
 * /api/v1/campaigns:
 *   post:
 *     summary: Create campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Campaign created
 */
router.post('/', asyncHandler(campaignController.createCampaign));

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   put:
 *     summary: Update campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Campaign updated
 */
router.put('/:id', asyncHandler(campaignController.updateCampaign));

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   delete:
 *     summary: Delete campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Campaign deleted
 */
router.delete('/:id', asyncHandler(campaignController.deleteCampaign));

// Campaign Analytics
/**
 * @swagger
 * /api/v1/campaigns/{id}/metrics:
 *   get:
 *     summary: Campaign metrics time-series
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional start date filter (requires endDate)
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional end date filter (requires startDate)
 *     responses:
 *       200:
 *         description: Campaign metrics rows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *                 meta:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/:id/metrics', asyncHandler(campaignController.getCampaignMetrics));

/**
 * @swagger
 * /api/v1/campaigns/{id}/performance:
 *   get:
 *     summary: Campaign performance aggregate (sum + averages)
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TenantIdHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Performance summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *                 meta:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/:id/performance', asyncHandler(campaignController.getCampaignPerformance));

// FLOW END: Campaign Routes (EN)
// จุดสิ้นสุด: Routes ของ Campaign (TH)

export default router;
