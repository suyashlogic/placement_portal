import express from 'express';
import * as c from '../controllers/placementController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateIdParam } from '../validators/managementValidator.js';
import { validatePlacement, validatePlacementStatus } from '../validators/offerValidator.js';

const router = express.Router();
const staff = authorize('PLACEMENT_OFFICER', 'ADMIN');

router.get('/me', authorize('STUDENT'), c.getMine);   // before any "/:id" route
router.get('/', staff, c.getOverview);
router.post('/', staff, validatePlacement, c.addPlacement);
router.patch('/:id/status', staff, validateIdParam, validatePlacementStatus, c.setStatus);

export default router;
