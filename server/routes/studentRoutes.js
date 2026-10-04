import express from 'express';
import * as c from '../controllers/studentController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateProfile, validateSkill } from '../validators/studentValidator.js';
import { uploadResume } from '../middleware/uploadResume.js';

const router = express.Router();
const studentOnly = authorize('STUDENT'); // per route: officers get their own routes here in Phase 5

router.get('/me', studentOnly, c.getMyProfile);
router.put('/me', studentOnly, validateProfile, c.updateMyProfile);
router.get('/me/dashboard', studentOnly, c.getMyDashboard);
router.get('/me/skills', studentOnly, c.getMySkills);
router.put('/me/skills', studentOnly, validateSkill, c.saveMySkill);
router.delete('/me/skills/:skillId', studentOnly, c.removeMySkill);
router.post('/me/resume', studentOnly, uploadResume, c.uploadMyResume);
router.get('/me/resume', studentOnly, c.downloadMyResume);

export default router;