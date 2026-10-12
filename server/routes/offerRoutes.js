import express from 'express';
import * as c from '../controllers/offerController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateIdParam } from '../validators/managementValidator.js';
import {
  validateNewOffer, validateOfferEdit, validateDecision, validateOfferQuery,
} from '../validators/offerValidator.js';

const router = express.Router();
const studentOnly = authorize('STUDENT');
const staff = authorize('PLACEMENT_OFFICER', 'ADMIN');
const anyRole = authorize('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN');

router.get('/', anyRole, validateOfferQuery, c.getOffers);
router.get('/candidates', staff, c.getCandidates);
router.post('/', staff, validateNewOffer, c.addOffer);
router.put('/:id', staff, validateIdParam, validateOfferEdit, c.editOffer);
router.patch('/:id/expire', staff, validateIdParam, c.expire);
router.patch('/:id/decision', studentOnly, validateIdParam, validateDecision, c.decide);

export default router;
