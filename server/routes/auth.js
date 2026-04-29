import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { createIpRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const loginRateLimiter = createIpRateLimiter({
  windowMs: 60_000,
  max: 8,
  message: 'Too many login attempts. Please wait and try again.',
  publicOnly: true,
});

router.post('/login', loginRateLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.me);

export default router;
