import { Router } from 'express';
import UsersController from '../controllers/usersController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/me/password', requireAuth, UsersController.changePassword);
router.put('/me', requireAuth, UsersController.updateProfile);
router.post('/zone-leader', requireRole(['admin']), UsersController.upsertZoneLeader);

export default router;
