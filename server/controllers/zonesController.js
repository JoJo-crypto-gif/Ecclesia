import ZonesService from '../services/zonesService.js';

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
      const zone = await ZonesService.create(req.body);
      res.status(201).json({ success: true, data: zone });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const zone = await ZonesService.update(req.params.id, req.body);
      res.json({ success: true, data: zone });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const zone = await ZonesService.delete(req.params.id);
      res.json({ success: true, data: zone, message: 'Zone deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
};

export default ZonesController;
