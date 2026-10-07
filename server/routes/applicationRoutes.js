import express from 'express';
import * as c from '../controllers/applicationController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateIdParam } from '../validators/managementValidator.js';
import { validateApply, validateStatusChange, validateApplicationQuery } from '../validators/applicationValidator.js';

const router = express.Router();
const studentOnly = authorize('STUDENT');
const staff = authorize('PLACEMENT_OFFICER', 'ADMIN');
const anyRole = authorize('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN');

router.post('/', studentOnly, validateApply, c.applyForDrive);
router.get('/', anyRole, validateApplicationQuery, c.getApplications);
router.get('/:id', anyRole, validateIdParam, c.getApplication);
router.patch('/:id/withdraw', studentOnly, validateIdParam, c.withdraw);
router.patch('/:id/status', staff, validateIdParam, validateStatusChange, c.updateStatus);

export default router;
