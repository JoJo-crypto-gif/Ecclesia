import { Router } from 'express';
import ZonesController from '../controllers/zonesController.js';
import { requireFields } from '../middleware/validate.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

const router = Router();

// Zone leaders can read zones (needed for their dashboard & dropdowns)
router.get('/', checkPermission('zones', 'read'), ZonesController.list);
router.get('/:id', checkPermission('zones', 'read'), ZonesController.getById);

// Only admins can create, update, or delete zones
router.post('/', checkPermission('zones', 'create'), requireFields(['name']), ZonesController.create);
router.put('/:id', checkPermission('zones', 'edit'), ZonesController.update);
router.delete('/:id', checkPermission('zones', 'delete'), ZonesController.delete);

export default router;
