import { Router } from 'express';
import MembersController from '../controllers/membersController.js';
import { requireFields, validateEmail } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { createIpRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const publicVisitorRateLimiter = createIpRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: 'Too many visitor registrations. Please try again shortly.',
  publicOnly: true,
});

// Public: create visitor member (used by public check-in)
router.post(
  '/visitors',
  publicVisitorRateLimiter,
  requireFields(['firstName', 'lastName', 'phone', 'instanceId']),
  validateEmail,
  MembersController.createVisitor
);

// Auth required below
router.use(requireAuth);

// GET /api/members — list all (with search, filter, pagination)
router.get('/', MembersController.list);

// GET /api/members/stats — dashboard statistics
router.get('/stats', MembersController.getStats);

// GET /api/members/birthdays — get birthdays by month (query: ?month)
router.get('/birthdays', MembersController.getBirthdays);

// GET /api/members/celebrations — birthdays or anniversaries by period filters
router.get('/celebrations', MembersController.getCelebrations);

// GET /api/members/:id — get single member
router.get('/:id', MembersController.getById);

// POST /api/members — create member
router.post(
  '/',
  requireFields(['firstName', 'lastName']), // Email and Phone are optional/conditional
  validateEmail,
  MembersController.create
);

// PUT /api/members/:id — update member
router.put(
  '/:id',
  validateEmail,
  MembersController.update
);

// DELETE /api/members/:id — delete member
router.delete('/:id', MembersController.delete);

export default router;
