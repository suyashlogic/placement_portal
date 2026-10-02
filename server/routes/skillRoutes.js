import express from 'express';
import { getSkillCatalog } from '../controllers/studentController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', isAuthenticated, getSkillCatalog);
export default router;