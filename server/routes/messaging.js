import { Router } from 'express';
import { sendManualMessage, getMessageHistory } from '../controllers/messagingController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/send', requireRole(['admin', 'zone_leader']), sendManualMessage);
router.get('/history', requireRole(['admin', 'zone_leader']), getMessageHistory);

export default router;
