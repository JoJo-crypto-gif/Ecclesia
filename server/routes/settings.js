import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

const router = Router();

// Define routes
router.get('/', checkPermission('settings', 'read'), getSettings);
router.put('/', checkPermission('settings', 'edit'), updateSettings);

export default router;
