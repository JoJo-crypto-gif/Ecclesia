import { Router } from 'express';
import ZonesController from '../controllers/zonesController.js';
import { requireFields } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Zone leaders can read zones (needed for their dashboard & dropdowns)
router.get('/', requireRole(['admin', 'zone_leader']), ZonesController.list);
router.get('/:id', requireRole(['admin', 'zone_leader']), ZonesController.getById);

// Only admins can create, update, or delete zones
router.post('/', requireRole(['admin']), requireFields(['name']), ZonesController.create);
router.put('/:id', requireRole(['admin']), ZonesController.update);
router.delete('/:id', requireRole(['admin']), ZonesController.delete);

export default router;
