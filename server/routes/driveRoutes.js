import express from 'express';
import { getDrives } from '../controllers/driveController.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();
router.get('/', authorize('STUDENT'), getDrives);
export default router;