import { Router } from 'express';
import ZonesController from '../controllers/zonesController.js';
import { requireFields } from '../middleware/validate.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Any authenticated user can read zones (needed for dropdowns across many modules)
router.get('/', requireAuth, ZonesController.list);
router.get('/:id', requireAuth, ZonesController.getById);

// Only admins can create, update, or delete zones
router.post('/', checkPermission('zones', 'create'), requireFields(['name']), ZonesController.create);
router.put('/:id', checkPermission('zones', 'edit'), ZonesController.update);
router.delete('/:id', checkPermission('zones', 'delete'), ZonesController.delete);

export default router;
