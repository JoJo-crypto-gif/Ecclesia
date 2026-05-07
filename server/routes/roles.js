import { Router } from 'express';
import RolesController from '../controllers/rolesController.js';
import { requireAuth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

const router = Router();

router.use(requireAuth);

// Only those who can edit settings can manage roles
router.get('/', checkPermission('settings', 'read'), RolesController.list);
router.get('/:id', checkPermission('settings', 'read'), RolesController.getById);
router.post('/', checkPermission('settings', 'edit'), RolesController.create);
router.put('/:id', checkPermission('settings', 'edit'), RolesController.update);
router.delete('/:id', checkPermission('settings', 'edit'), RolesController.delete);

export default router;
