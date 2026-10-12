import express from 'express';
import * as c from '../controllers/adminController.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(authorize('ADMIN'));

router.get('/email/status', c.getEmailStatus);
router.post('/email/test', c.sendTestEmail);
router.post('/reminders/run', c.runReminders);
router.post('/maintenance/run', c.runMaintenance);

export default router;
