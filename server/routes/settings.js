import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Define routes
router.get('/', requireRole(['admin']), getSettings);
router.put('/', requireRole(['admin']), updateSettings);

export default router;
