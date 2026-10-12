import express from 'express';
import * as c from '../controllers/notificationController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { validateIdParam } from '../validators/managementValidator.js';

const router = express.Router();
router.use(isAuthenticated);               // every role has notifications, but only their own

router.get('/', c.getMine);
router.patch('/read-all', c.readAll);      // before "/:id/read"
router.patch('/:id/read', validateIdParam, c.read);

export default router;
