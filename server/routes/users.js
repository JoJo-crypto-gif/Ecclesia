import { Router } from 'express';
import UsersController from '../controllers/usersController.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/me/password', requireAuth, UsersController.changePassword);
router.put('/me', requireAuth, UsersController.updateProfile);
router.post('/zone-leader', checkPermission('settings', 'edit'), UsersController.upsertZoneLeader);

export default router;
