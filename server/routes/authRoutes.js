import express from 'express';
import { register, login, logout, me } from '../controllers/authController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateLogin, validateRegister } from '../validators/authValidator.js';

const router = express.Router();

// Middleware runs left to right: limiter → validator → controller
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/logout', logout);
router.get('/me', isAuthenticated, me);

// TEMPORARY: lets you test authorization. Delete in Phase 4.
router.get('/admin-check', authorize('ADMIN'), (req, res) => {
  res.json({ success: true, message: 'You are an admin' });
});

export default router;