import { Router } from 'express';
import UsersController from '../controllers/usersController.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/me/password', requireAuth, UsersController.changePassword);
router.put('/me', requireAuth, UsersController.updateProfile);
router.post('/zone-leader', checkPermission('settings', 'edit'), UsersController.upsertZoneLeader);

// User Management (Admin/Settings access)
router.get('/', requireAuth, checkPermission('settings', 'read'), UsersController.list);
router.post('/', requireAuth, checkPermission('settings', 'edit'), UsersController.create);
router.put('/:id', requireAuth, checkPermission('settings', 'edit'), UsersController.updateUser);
router.delete('/:id', requireAuth, checkPermission('settings', 'edit'), UsersController.delete);

export default router;
