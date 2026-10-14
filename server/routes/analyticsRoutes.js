import express from 'express';
import * as c from '../controllers/analyticsController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateAnalyticsQuery } from '../validators/analyticsValidator.js';

const router = express.Router();
const staff = authorize('PLACEMENT_OFFICER', 'ADMIN');

// Students: only their own insights (the student id comes from the session)
router.get('/me', authorize('STUDENT'), c.myInsights);

// Dashboards
router.get('/dashboard/officer', staff, c.staffDashboard);
router.get('/dashboard/admin', authorize('ADMIN'), c.adminDashboard);

// The seven reports from the specification (+ funnel and status breakdown), staff only
router.get('/overview', staff, c.overview);
router.get('/department-placement', staff, validateAnalyticsQuery, c.departmentPlacement);
router.get('/company-hiring', staff, validateAnalyticsQuery, c.companyHiring);
router.get('/package-statistics', staff, validateAnalyticsQuery, c.packageStatistics);
router.get('/drive-selection', staff, validateAnalyticsQuery, c.driveSelection);
router.get('/funnel', staff, validateAnalyticsQuery, c.funnel);
router.get('/placement-trends', staff, validateAnalyticsQuery, c.placementTrends);
router.get('/status-breakdown', staff, c.statusBreakdown);

export default router;
