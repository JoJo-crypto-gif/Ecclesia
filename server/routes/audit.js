import { Router } from 'express';
import AuditController from '../controllers/auditController.js';

const router = Router();

router.get('/', AuditController.list);
router.get('/:id', AuditController.getById);

export default router;
