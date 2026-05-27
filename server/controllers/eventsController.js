import EventsService from '../services/eventsService.js';
import AutoStatusService from '../services/autoStatusService.js';
import EventsModel from '../models/eventsModel.js';

const EventsController = {
  // GET /api/events
  async list(req, res, next) {
    try {
      const { type, isActive } = req.query;
      const user = req.session?.user;
      const isIsolated = user?.role !== 'admin' && user?.zoneId;
      const events = await EventsService.list({
        type,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        zoneId: isIsolated ? user.zoneId : undefined,
        includeGlobal: isIsolated,
      });
      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/:id
  async getById(req, res, next) {
    try {
      const event = await EventsService.getById(req.params.id);
      if (!event) return res.status(404).json({ success: false, error: { message: 'Event not found' } });
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        if (event.zoneId && event.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/events
  async create(req, res, next) {
    try {
      const user = req.session?.user;
      const payload = { ...req.body };
      if (user?.role !== 'admin' && user?.zoneId) {
        payload.zoneId = user.zoneId;
      }
      const event = await EventsService.create(payload);
      res.status(201).json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/events/:id
  async update(req, res, next) {
    try {
      const user = req.session?.user;
      const existing = await EventsService.getById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Event not found' } });
      
      const isIsolated = user?.role !== 'admin' && user?.zoneId;
      if (isIsolated && existing.zoneId !== user.zoneId) {
        return res.status(403).json({ success: false, error: { message: 'Access denied' } });
      }
      const payload = { ...req.body };
      if (isIsolated) {
        payload.zoneId = user.zoneId;
      }
      const event = await EventsService.update(req.params.id, payload);
      if (!event) return res.status(404).json({ success: false, error: { message: 'Event not found' } });
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/events/:id
  async delete(req, res, next) {
    try {
      const user = req.session?.user;
      const existing = await EventsService.getById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Event not found' } });
      if (user?.role !== 'admin' && user?.zoneId && existing.zoneId !== user.zoneId) {
        return res.status(403).json({ success: false, error: { message: 'Access denied' } });
      }
      const result = await EventsService.delete(req.params.id);
      if (!result) return res.status(404).json({ success: false, error: { message: 'Event not found' } });
      res.json({ success: true, message: 'Event deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ─── Instances ─────────────────────────────────────────

  // GET /api/events/:id/instances
  async listInstances(req, res, next) {
    try {
      const { status, fromDate, toDate, limit } = req.query;
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const event = await EventsService.getById(req.params.id);
        if (!event || (event.zoneId && event.zoneId !== user.zoneId)) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const parsedLimit = limit !== undefined ? Number.parseInt(limit, 10) : undefined;
      const instances = await EventsService.listInstances(req.params.id, {
        status,
        fromDate,
        toDate,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      });
      res.json({ success: true, data: instances });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/instances/all
  async listAllInstances(req, res, next) {
    try {
      const { fromDate, toDate } = req.query;
      const user = req.session?.user;
      const isIsolated = user?.role !== 'admin' && user?.zoneId;
      const instances = await EventsService.listAllInstances({ 
        fromDate, 
        toDate, 
        zoneId: isIsolated ? user.zoneId : undefined,
        includeGlobal: isIsolated
      });
      res.json({ success: true, data: instances });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/instances/:instanceId
  async getInstance(req, res, next) {
    try {
      const instance = await EventsService.getInstance(req.params.instanceId);
      if (!instance) return res.status(404).json({ success: false, error: { message: 'Instance not found' } });
      res.json({ success: true, data: instance });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:id/instances/generate
  async generateInstances(req, res, next) {
    try {
      const { weeks = 52 } = req.body;
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const event = await EventsService.getById(req.params.id);
        if (!event || event.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const instances = await EventsService.generateInstances(req.params.id, weeks);
      res.status(201).json({ success: true, data: instances, message: `Generated ${instances.length} instances` });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/events/:id/instances
  async createInstance(req, res, next) {
    try {
      const { date, notes } = req.body;
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const event = await EventsService.getById(req.params.id);
        if (!event || event.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const instance = await EventsService.createInstance(req.params.id, date, notes);
      if (!instance) return res.status(409).json({ success: false, error: { message: 'Instance already exists for this date' } });
      res.status(201).json({ success: true, data: instance });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/events/instances/:instanceId
  async updateInstance(req, res, next) {
    try {
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const instance = await EventsService.getInstance(req.params.instanceId);
        if (!instance || instance.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const instance = await EventsService.updateInstance(req.params.instanceId, req.body);
      if (!instance) return res.status(404).json({ success: false, error: { message: 'Instance not found' } });

      // If instance was manually completed, check for auto-inactive (global Service only)
      if (req.body.status === 'completed') {
        const event = await EventsModel.findEventByInstanceId(req.params.instanceId);
        if (event && event.zone_id === null && String(event.type).toLowerCase() === 'service') {
          AutoStatusService.checkAutoInactive().catch(err =>
            console.error('[AutoStatus] Error in post-completion check:', err)
          );
        }
      }

      res.json({ success: true, data: instance });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/events/instances/:instanceId
  async deleteInstance(req, res, next) {
    try {
      const user = req.session?.user;
      if (user?.role !== 'admin' && user?.zoneId) {
        const instance = await EventsService.getInstance(req.params.instanceId);
        if (!instance || instance.zoneId !== user.zoneId) {
          return res.status(403).json({ success: false, error: { message: 'Access denied' } });
        }
      }
      const result = await EventsService.deleteInstance(req.params.instanceId);
      if (!result) return res.status(404).json({ success: false, error: { message: 'Instance not found' } });
      res.json({ success: true, message: 'Instance deleted' });
    } catch (err) {
      next(err);
    }
  },
};

export default EventsController;
