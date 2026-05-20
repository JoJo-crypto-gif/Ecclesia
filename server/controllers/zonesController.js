import ZonesService from '../services/zonesService.js';
import AuditService from '../services/auditService.js';

const ZonesController = {
  async list(req, res, next) {
    try {
      const zones = await ZonesService.list();
      res.json({ success: true, data: zones });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const zone = await ZonesService.getById(req.params.id);
      res.json({ success: true, data: zone });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      const zone = await ZonesService.create(req.body);
      AuditService.log({
        req,
        user: sessionUser,
        action: 'CREATE',
        module: 'zones',
        recordId: zone.id,
        recordName: zone.name,
        description: `Created zone ${zone.name}`,
        changes: AuditService.computeChanges({}, zone)
      });
      res.status(201).json({ success: true, data: zone });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      const existing = await ZonesService.getById(req.params.id);
      const zone = await ZonesService.update(req.params.id, req.body);
      const changes = AuditService.computeChanges(existing, zone);
      if (Object.keys(changes).length > 0) {
        AuditService.log({
          req,
          user: sessionUser,
          action: 'UPDATE',
          module: 'zones',
          recordId: zone.id,
          recordName: zone.name,
          description: `Updated zone ${zone.name}`,
          changes
        });
      }
      res.json({ success: true, data: zone });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      const existing = await ZonesService.getById(req.params.id);
      const zone = await ZonesService.delete(req.params.id);
      AuditService.log({
        req,
        user: sessionUser,
        action: 'DELETE',
        module: 'zones',
        recordId: existing.id,
        recordName: existing.name,
        description: `Deleted zone ${existing.name}`,
        changes: AuditService.computeChanges(existing, {})
      });
      res.json({ success: true, data: zone, message: 'Zone deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
};

export default ZonesController;
