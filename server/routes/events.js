import { Router } from 'express';
import EventsController from '../controllers/eventsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── Instance routes (must come before /instances/:instanceId) ────
router.get('/instances/all', requireAuth, EventsController.listAllInstances);

// ─── Public instance lookup (used by check-in links) ─────
router.get('/instances/:instanceId', EventsController.getInstance);

// ─── Auth required below ─────────────────────────────────
router.use(requireAuth);

// ─── Instance updates ─────────────
router.put('/instances/:instanceId', EventsController.updateInstance);
router.delete('/instances/:instanceId', EventsController.deleteInstance);

// ─── Event template CRUD ─────────────────────────────────
router.get('/', EventsController.list);
router.post('/', EventsController.create);
router.get('/:id', EventsController.getById);
router.put('/:id', EventsController.update);
router.delete('/:id', EventsController.delete);

// ─── Instance management under an event ──────────────────
router.get('/:id/instances', EventsController.listInstances);
router.post('/:id/instances', EventsController.createInstance);
router.post('/:id/instances/generate', EventsController.generateInstances);

export default router;
