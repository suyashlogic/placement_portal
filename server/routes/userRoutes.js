import express from 'express';
import * as c from '../controllers/userController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  validateIdParam, validateOfficer, validatePasswordReset, validateActive,
} from '../validators/managementValidator.js';

const router = express.Router();
router.use(authorize('ADMIN')); // every route in this file is admin-only

router.get('/', c.getUsers);
router.post('/officers', validateOfficer, c.addOfficer);
router.patch('/:id/active', validateIdParam, validateActive, c.setActive);
router.patch('/:id/password', validateIdParam, validatePasswordReset, c.resetPassword);

export default router;
