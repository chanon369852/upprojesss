import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import * as reportController from '../controllers/report.controller';

// FLOW START: Reports Routes (EN)
// จุดเริ่มต้น: Routes ของ Reports (TH)

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/reports:
 *   get:
 *     summary: List reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reports list
 */
router.get('/', asyncHandler(reportController.getReports));

/**
 * @swagger
 * /api/v1/reports/{id}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report
 */
router.get('/:id', asyncHandler(reportController.getReportById));
router.post('/', asyncHandler(reportController.createReport));
router.put('/:id', asyncHandler(reportController.updateReport));
router.delete('/:id', asyncHandler(reportController.deleteReport));
router.post('/:id/generate', asyncHandler(reportController.generateReport));
router.get('/:id/download', asyncHandler(reportController.downloadReport));

// FLOW END: Reports Routes (EN)
// จุดสิ้นสุด: Routes ของ Reports (TH)

export default router;
