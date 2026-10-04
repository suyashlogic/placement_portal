import express from 'express';
import * as c from '../controllers/driveController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  validateIdParam, validateDrive, validateDriveStatus,
} from '../validators/managementValidator.js';

const router = express.Router();
const anyRole = authorize('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN');
const staff = authorize('PLACEMENT_OFFICER', 'ADMIN');

// Students and staff share these two URLs; the controller returns role-specific data
router.get('/', anyRole, c.getDrives);
router.get('/:id', anyRole, validateIdParam, c.getDriveById);

// Staff only
router.post('/', staff, validateDrive, c.addDrive);
router.put('/:id', staff, validateIdParam, validateDrive, c.editDrive);
router.patch('/:id/status', staff, validateIdParam, validateDriveStatus, c.setDriveStatus);
router.get('/:id/eligible-students', staff, validateIdParam, c.getEligibleStudents);

export default router;
