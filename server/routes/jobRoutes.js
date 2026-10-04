import express from 'express';
import * as c from '../controllers/jobController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateIdParam, validateJob } from '../validators/managementValidator.js';

const router = express.Router();
router.use(authorize('PLACEMENT_OFFICER', 'ADMIN'));

router.get('/', c.getJobs);
router.post('/', validateJob, c.addJob);
router.put('/:id', validateIdParam, validateJob, c.editJob);

export default router;
