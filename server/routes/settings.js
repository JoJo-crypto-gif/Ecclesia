import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Define routes
router.get('/', requireAuth, getSettings);
router.put('/', checkPermission('settings', 'edit'), updateSettings);

export default router;
