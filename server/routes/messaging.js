import { Router } from 'express';
import { sendManualMessage, getMessageHistory } from '../controllers/messagingController.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

const router = Router();

router.post('/send', checkPermission('messaging', 'create'), sendManualMessage);
router.get('/history', checkPermission('messaging', 'read'), getMessageHistory);

export default router;
