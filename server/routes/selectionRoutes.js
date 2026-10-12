import express from 'express';
import * as c from '../controllers/selectionController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateIdParam } from '../validators/managementValidator.js';
import {
  validateRoundForApplication, validateRound, validateResult, validateShortlist,
} from '../validators/selectionValidator.js';

const router = express.Router();
router.use(authorize('PLACEMENT_OFFICER', 'ADMIN'));   // officers and admins only

router.post('/shortlist', validateShortlist, c.shortlist);
router.get('/drive/:id', validateIdParam, c.getBoard);
router.post('/drive/:id/rounds', validateIdParam, validateRound, c.addRoundForDrive);
router.post('/', validateRoundForApplication, c.addRound);
router.put('/:id', validateIdParam, validateRound, c.editRound);
router.patch('/:id/result', validateIdParam, validateResult, c.setResult);

export default router;
