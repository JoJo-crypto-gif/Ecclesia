import RolesModel from '../models/rolesModel.js';

const RolesController = {
  async list(req, res, next) {
    try {
      const roles = await RolesModel.getAll();
      res.json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const role = await RolesModel.getById(req.params.id);
      if (!role) return res.status(404).json({ success: false, error: { message: 'Role not found' } });
      res.json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { name, description, permissions } = req.body;
      if (!name) return res.status(400).json({ success: false, error: { message: 'Name is required' } });
      
      const existing = await RolesModel.getByName(name);
      if (existing) return res.status(400).json({ success: false, error: { message: 'Role name already exists' } });

      const role = await RolesModel.create({ name, description, permissions });
      res.status(201).json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { name, description, permissions } = req.body;
      const role = await RolesModel.update(req.params.id, { name, description, permissions });
      if (!role) return res.status(404).json({ success: false, error: { message: 'Role not found or is a protected system role' } });
      res.json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const success = await RolesModel.delete(req.params.id);
      if (!success) return res.status(404).json({ success: false, error: { message: 'Role not found or is a protected system role' } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
};

export default RolesController;
