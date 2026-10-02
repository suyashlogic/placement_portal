import express from 'express';
import { getDepartments } from '../controllers/departmentController.js';

const router = express.Router();

// Public on purpose: the registration form needs it before anyone is logged in
router.get('/', getDepartments);

export default router;