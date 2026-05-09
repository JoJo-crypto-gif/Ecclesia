import { Router } from 'express';
import AttendanceController from '../controllers/attendanceController.js';
import { requireAuth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';
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
router.get('/stats', checkPermission('dashboard', 'read'), AttendanceController.getStats);
router.get('/global-trends', checkPermission('reports', 'read'), AttendanceController.getGlobalTrends);
router.get('/report-overview', checkPermission('reports', 'read'), AttendanceController.getReportOverview);
router.get('/zone-health', checkPermission('dashboard', 'read'), AttendanceController.getZoneHealth);
router.get('/demographics', checkPermission('dashboard', 'read'), AttendanceController.getDemographicAttendance);
router.get('/trends', checkPermission('dashboard', 'read'), AttendanceController.getDynamicTrends);
router.get('/trends/:eventId', checkPermission('dashboard', 'read'), AttendanceController.getTrends);

// ─── Instance attendance ─────────────────────────────────
router.get('/instance/:instanceId', checkPermission('attendance', 'read'), AttendanceController.listByInstance);

// ─── Member analytics (must come before /member/:memberId) ───
router.get('/member/:memberId/analytics', checkPermission('attendance', 'read'), AttendanceController.getMemberAnalytics);

// ─── Member history ──────────────────────────────────────
router.get('/member/:memberId', checkPermission('attendance', 'read'), AttendanceController.getMemberHistory);

// ─── Remove attendance (specific instance+member) ────────
router.delete('/instance/:instanceId/member/:memberId', checkPermission('attendance', 'delete'), AttendanceController.removeByInstanceAndMember);

// ─── Remove by record ID ────────────────────────────────
router.delete('/:id', checkPermission('attendance', 'delete'), AttendanceController.remove);

export default router;
