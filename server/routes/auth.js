import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { createIpRateLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const loginRateLimiter = createIpRateLimiter({
  windowMs: 60_000,
  max: 8,
  message: 'Too many login attempts. Please wait and try again.',
  publicOnly: true,
});
const forgotPasswordRateLimiter = createIpRateLimiter({
  windowMs: 60_000,
  max: 5,
  message: 'Too many password reset requests. Please wait and try again.',
});

router.post('/forgot-password', forgotPasswordRateLimiter, AuthController.forgotPassword);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/verify-mfa', loginRateLimiter, AuthController.verifyMfa);
router.post('/complete-password-reset', requireAuth, AuthController.completePasswordReset);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.me);

export default router;
