import MembersService from '../services/membersService.js';
import EventsService from '../services/eventsService.js';
import AuditService from '../services/auditService.js';

/**
 * Members controller — handles HTTP request/response.
 */
const MembersController = {
  /**
   * GET /api/members/birthdays
   * Query params: month (1-12)
   */
  async getBirthdays(req, res, next) {
    try {
      const month = parseInt(req.query.month, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ success: false, error: { message: 'Invalid month' } });
      }

      const sessionUser = req.session?.user || req.user;
      const role = sessionUser?.role;
      const zoneId = sessionUser?.zoneId;

      const birthdays = await MembersService.getBirthdaysByMonth(month, role, zoneId);
      res.json({ success: true, data: birthdays });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/members/celebrations
   * Query params:
   * - type: birthday | anniversary
   * - period: week | month
   * - window: current | upcoming
   * - date: YYYY-MM-DD (optional reference date)
   */
  async getCelebrations(req, res, next) {
    try {
      const type = (req.query.type || 'birthday').toString().toLowerCase();
      const period = (req.query.period || 'month').toString().toLowerCase();
      const window = (req.query.window || 'current').toString().toLowerCase();
      const referenceDate = req.query.date ? req.query.date.toString() : undefined;

      const validTypes = ['birthday', 'anniversary', 'baptism_anniversary'];
      const validPeriods = ['week', 'month'];
      const validWindows = ['current', 'upcoming', 'today'];

      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid celebration type' } });
      }
      if (!validPeriods.includes(period)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid period filter' } });
      }
      if (!validWindows.includes(window)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid window filter' } });
      }

      const sessionUser = req.session?.user || req.user;
      const role = sessionUser?.role;
      const zoneId = sessionUser?.zoneId;
      if (role === 'zone_leader' && !zoneId) {
        return res.status(403).json({ success: false, error: { message: 'No zone assigned' } });
      }

      const result = await MembersService.getCelebrations({
        type,
        period,
        window,
        referenceDate,
        userRole: role,
        userZoneId: zoneId
      });

      res.json({
        success: true,
        data: result.celebrations,
        meta: {
          type,
          period,
          window,
          rangeStart: result.rangeStart,
          rangeEnd: result.rangeEnd
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/members
   * Query params: search, status, zoneId, limit, offset
   */
  async list(req, res, next) {
    try {
      const { search, status, zoneId, isBaptized, gender, limit, offset } = req.query;
      const sessionUser = req.session?.user;
      if (sessionUser?.role !== 'admin' && sessionUser?.zoneId) {
        // Enforce their zone ID
        var effectiveZoneId = sessionUser.zoneId;
      } else {
        var effectiveZoneId = zoneId;
      }

      const result = await MembersService.list({
        search,
        status,
        zoneId: effectiveZoneId,
        isBaptized,
        gender,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      const p = result.pagination;
      res.json({
        success: true,
        data: result.members,
        pagination: {
          total: p.total,
          limit: p.limit,
          offset: p.offset,
          totalPages: Math.ceil(p.total / p.limit),
          currentPage: Math.floor(p.offset / p.limit) + 1,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/members/stats
   */
  async getStats(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      const zoneId = sessionUser?.role === 'zone_leader' ? sessionUser.zoneId : undefined;
      const stats = await MembersService.getStats(zoneId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/members/age-trends
   */
  async getAgeTrends(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      const zoneId = sessionUser?.role === 'zone_leader' ? sessionUser.zoneId : undefined;
      const trends = await MembersService.getAgeTrends(zoneId);
      res.json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/members/:id
   */
  async getById(req, res, next) {
    try {
      const member = await MembersService.getById(req.params.id);
      const sessionUser = req.session?.user;
      if (sessionUser?.role === 'zone_leader' && member.zoneId !== sessionUser.zoneId) {
        return res.status(403).json({ success: false, error: { message: 'Access denied' } });
      }
      res.json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/members
   */
  async create(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      if (sessionUser?.role === 'zone_leader' && !sessionUser.zoneId) {
        return res.status(403).json({ success: false, error: { message: 'No zone assigned' } });
      }
      const payload = { ...req.body };
      if (sessionUser?.role === 'zone_leader') {
        payload.zoneId = sessionUser.zoneId;
      }
      const member = await MembersService.create(payload);
      AuditService.log({
        req,
        user: sessionUser,
        action: 'CREATE',
        module: 'members',
        recordId: member.id,
        recordName: `${member.firstName} ${member.lastName}`,
        description: `Created member ${member.firstName} ${member.lastName}`,
        changes: AuditService.computeChanges({}, member)
      });
      res.status(201).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/members/visitors
   * Public visitor registration (used by check-in)
   */
  async createVisitor(req, res, next) {
    try {
      const { instanceId } = req.body;
      const instance = await EventsService.getInstance(instanceId);
      if (!instance) {
        return res.status(400).json({ success: false, error: { message: 'Invalid check-in instance' } });
      }

      const data = {
        ...req.body,
        otherName: req.body.otherName || req.body.middleName || null,
        status: 'Visitor',
        role: req.body.role || 'Member',
        joinDate: req.body.joinDate,
        zoneId: instance.zoneId || null,
      };
      delete data.instanceId;
      delete data.middleName;
      const member = await MembersService.create(data);
      AuditService.log({
        req,
        user: null,
        action: 'CREATE',
        module: 'members',
        recordId: member.id,
        recordName: `${member.firstName} ${member.lastName}`,
        description: `Visitor self-registered: ${member.firstName} ${member.lastName}`,
        changes: AuditService.computeChanges({}, member)
      });
      res.status(201).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/members/:id
   */
  async update(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      if (sessionUser?.role === 'zone_leader' && !sessionUser.zoneId) {
        return res.status(403).json({ success: false, error: { message: 'No zone assigned' } });
      }
      const existing = await MembersService.getById(req.params.id);
      if (sessionUser?.role === 'zone_leader' && existing.zoneId !== sessionUser.zoneId) {
        return res.status(403).json({ success: false, error: { message: 'Access denied' } });
      }
      const payload = { ...req.body };
      if (sessionUser?.role === 'zone_leader') {
        payload.zoneId = sessionUser.zoneId;
      }
      const member = await MembersService.update(req.params.id, payload);
      const changes = AuditService.computeChanges(existing, member);
      if (Object.keys(changes).length > 0) {
        AuditService.log({
          req,
          user: sessionUser,
          action: 'UPDATE',
          module: 'members',
          recordId: member.id,
          recordName: `${member.firstName} ${member.lastName}`,
          description: `Updated member ${member.firstName} ${member.lastName}`,
          changes
        });
      }
      res.json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/members/:id
   */
  async delete(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      if (sessionUser?.role === 'zone_leader') {
        return res.status(403).json({ success: false, error: { message: 'Access denied' } });
      }
      const existing = await MembersService.getById(req.params.id);
      const member = await MembersService.delete(req.params.id);
      AuditService.log({
        req,
        user: sessionUser,
        action: 'DELETE',
        module: 'members',
        recordId: existing.id,
        recordName: `${existing.firstName} ${existing.lastName}`,
        description: `Deleted member ${existing.firstName} ${existing.lastName}`,
        changes: AuditService.computeChanges(existing, {})
      });
      res.json({ success: true, data: member, message: 'Member deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};

export default MembersController;
