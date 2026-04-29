import { Router } from 'express';
import AttendanceController from '../controllers/attendanceController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createIpRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const publicCheckInRateLimiter = createIpRateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many check-in attempts. Please try again in a moment.',
  publicOnly: true,
});

// ─── Public Check-in ─────────────────────────────────────
router.post('/check-in', publicCheckInRateLimiter, AttendanceController.checkIn);

// ─── Auth required below ─────────────────────────────────
router.use(requireAuth);

// ─── Stats & Trends ──────────────────────────────────────
router.get('/stats', AttendanceController.getStats);
router.get('/global-trends', AttendanceController.getGlobalTrends);
router.get('/zone-health', requireRole(['admin']), AttendanceController.getZoneHealth);
router.get('/demographics', requireRole(['admin']), AttendanceController.getDemographicAttendance);
router.get('/trends', AttendanceController.getDynamicTrends); // New dynamic endpoint
router.get('/trends/:eventId', AttendanceController.getTrends);

// ─── Instance attendance ─────────────────────────────────
router.get('/instance/:instanceId', AttendanceController.listByInstance);

// ─── Member analytics (must come before /member/:memberId) ───
router.get('/member/:memberId/analytics', AttendanceController.getMemberAnalytics);

// ─── Member history ──────────────────────────────────────
router.get('/member/:memberId', AttendanceController.getMemberHistory);

// ─── Remove attendance (specific instance+member) ────────
router.delete('/instance/:instanceId/member/:memberId', AttendanceController.removeByInstanceAndMember);

// ─── Remove by record ID ────────────────────────────────
router.delete('/:id', AttendanceController.remove);

export default router;
