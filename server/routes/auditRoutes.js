import express from 'express';
import * as c from '../controllers/auditController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateAuditQuery } from '../validators/auditValidator.js';

const router = express.Router();
router.use(authorize('ADMIN'));          // the audit trail is for administrators only

router.get('/filters', c.getFilterOptions);   // before any "/:id" style route
router.get('/', validateAuditQuery, c.getLogs);

export default router;
