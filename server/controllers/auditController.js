import AuditService from '../services/auditService.js';

const AuditController = {
  async list(req, res, next) {
    try {
      const { search, module, action, dateFrom, dateTo, limit, offset } = req.query;
      const result = await AuditService.list({
        search,
        module,
        action,
        dateFrom,
        dateTo,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      const p = result.pagination;
      res.json({
        success: true,
        data: result.logs,
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

  async getById(req, res, next) {
    try {
      const log = await AuditService.getById(req.params.id);
      if (!log) {
        return res.status(404).json({
          success: false,
          error: { message: 'Audit log not found' },
        });
      }
      res.json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  },
};

export default AuditController;
