import AttendanceService from '../services/attendanceService.js';
import EventsService from '../services/eventsService.js';
import MembersService from '../services/membersService.js';

const AttendanceController = {
  // POST /api/attendance/check-in
  async checkIn(req, res, next) {
    try {
      const { instanceId, memberId, visitorName, status } = req.body;
      const isPublicCheckIn = !req.session?.user;
      if (!instanceId) {
        return res.status(400).json({ success: false, error: { message: 'instanceId is required' } });
      }
      if (!memberId && !visitorName) {
        return res.status(400).json({ success: false, error: { message: 'memberId or visitorName is required' } });
      }

      const options = isPublicCheckIn
        ? {
            identifierMode: 'contact_only',
            allowIdentifierFallbackToVisitor: false,
            memberPayload: 'public',
          }
        : {
            identifierMode: 'all',
            allowIdentifierFallbackToVisitor: true,
            memberPayload: 'private',
          };

      const record = await AttendanceService.checkIn(
        { instanceId, memberId, visitorName, status: isPublicCheckIn ? undefined : status },
        options
      );
      res.status(201).json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/instance/:instanceId
  async listByInstance(req, res, next) {
    try {
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const instance = await EventsService.getInstance(req.params.instanceId);
        if (!instance) return res.status(404).json({ success: false, error: { message: 'Instance not found' } });
        if (instance.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const records = await AttendanceService.listByInstance(req.params.instanceId);
      res.json({ success: true, data: records });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/attendance/:id
  async remove(req, res, next) {
    try {
      const user = req.session?.user;
      const zoneId = (user?.role !== 'admin' && user?.zoneId) ? user.zoneId : undefined;
      if (zoneId) {
        const record = await AttendanceService.getById(req.params.id);
        if (!record) return res.status(404).json({ success: false, error: { message: 'Record not found' } });
        if (record.zone_id !== zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const result = await AttendanceService.remove(req.params.id);
      if (!result) return res.status(404).json({ success: false, error: { message: 'Record not found' } });
      res.json({ success: true, message: 'Attendance record removed' });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/attendance/instance/:instanceId/member/:memberId
  async removeByInstanceAndMember(req, res, next) {
    try {
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const instance = await EventsService.getInstance(req.params.instanceId);
        if (!instance) return res.status(404).json({ success: false, error: { message: 'Instance not found' } });
        if (instance.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const result = await AttendanceService.removeByInstanceAndMember(
        req.params.instanceId,
        req.params.memberId
      );
      if (!result) return res.status(404).json({ success: false, error: { message: 'Record not found' } });
      res.json({ success: true, message: 'Attendance record removed' });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/stats
  async getStats(req, res, next) {
    try {
      const user = req.session?.user;
      const zoneId = (user?.role !== 'admin' && user?.zoneId) ? user.zoneId : undefined;
      const stats = await AttendanceService.getStats(zoneId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/member/:memberId
  async getMemberHistory(req, res, next) {
    try {
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const member = await MembersService.getById(req.params.memberId);
        if (member.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const records = await AttendanceService.getMemberHistory(req.params.memberId);
      res.json({ success: true, data: records });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/trends/:eventId
  async getTrends(req, res, next) {
    try {
      const { weeks } = req.query;
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const event = await EventsService.getById(req.params.eventId);
        if (!event || event.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const trends = await AttendanceService.getTrends(req.params.eventId, { weeks: weeks ? parseInt(weeks) : 12 });
      res.json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/global-trends
  async getGlobalTrends(req, res, next) {
    try {
      const { months } = req.query;
      const user = req.session?.user;
      const zoneId = (user?.role !== 'admin' && user?.zoneId) ? user.zoneId : undefined;
      const trends = await AttendanceService.getGlobalTrends({ 
        months: months ? parseInt(months) : 7,
        zoneId
      });
      res.json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/trends (Dynamic)
  async getDynamicTrends(req, res, next) {
    try {
      const { period, eventId, limit } = req.query;
      const user = req.session?.user;
      const zoneId = (user?.role !== 'admin' && user?.zoneId) ? user.zoneId : undefined;
      const trends = await AttendanceService.getDynamicTrends({ 
        period: period || 'month', 
        eventId: eventId || null,
        limit: limit ? parseInt(limit) : 12,
        zoneId
      });
      res.json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/member/:memberId/analytics
  async getMemberAnalytics(req, res, next) {
    try {
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const member = await MembersService.getById(req.params.memberId);
        if (member.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const analytics = await AttendanceService.getMemberAnalytics(req.params.memberId);
      res.json({ success: true, data: analytics });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/zone-health
  async getZoneHealth(req, res, next) {
    try {
      const user = req.session?.user;
      const zoneId = (user?.role !== 'admin' && user?.zoneId) ? user.zoneId : undefined;
      const data = await AttendanceService.getZoneHealth({ zoneId });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/demographics
  async getDemographicAttendance(req, res, next) {
    try {
      const user = req.session?.user;
      const zoneId = (user?.role !== 'admin' && user?.zoneId) ? user.zoneId : undefined;
      const data = await AttendanceService.getDemographicAttendance({ zoneId });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/attendance/report-overview
  async getReportOverview(req, res, next) {
    try {
      const user = req.session?.user;
      const zoneId = (user?.role !== 'admin' && user?.zoneId) ? user.zoneId : undefined;
      const data = await AttendanceService.getReportOverview({ zoneId });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};

export default AttendanceController;
