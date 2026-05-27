import { Router } from 'express';
import {
  sendManualMessage,
  getMessageHistory,
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  triggerAutomationJob
} from '../controllers/messagingController.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

const router = Router();

router.post('/send', checkPermission('messaging', 'create'), sendManualMessage);
router.post('/trigger-automation', checkPermission('messaging', 'create'), triggerAutomationJob);
router.get('/history', checkPermission('messaging', 'read'), getMessageHistory);

// ─── Email Template CRUD ─────────────────────────────────
router.get('/templates', checkPermission('messaging', 'read'), getEmailTemplates);
router.get('/templates/:id', checkPermission('messaging', 'read'), getEmailTemplateById);
router.post('/templates', checkPermission('messaging', 'create'), createEmailTemplate);
router.put('/templates/:id', checkPermission('messaging', 'edit'), updateEmailTemplate);
router.delete('/templates/:id', checkPermission('messaging', 'delete'), deleteEmailTemplate);

export default router;
