import { query } from '../config/db.js';

const AuditService = {
  /**
   * Log an audit event.
   * @param {Object} params
   * @param {Object} [params.req] - Express request object (optional, for IP/UA)
   * @param {Object} [params.user] - Session user who executed the action
   * @param {string} params.action - e.g. 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
   * @param {string} params.module - e.g. 'members', 'zones', 'events', 'users', 'roles', 'settings', 'auth'
   * @param {string} [params.recordId] - Target record UUID
   * @param {string} [params.recordName] - Target record name/identifier
   * @param {string} params.description - Human-readable description
   * @param {Object} [params.changes] - JSON diff payload: { field: { old, new } }
   */
  async log({ req, user, action, module, recordId, recordName, description, changes = {} }) {
    try {
      const actorId = user?.id || null;
      const actorName = user?.name || null;
      const actorEmail = user?.email || null;
      const actorRole = user?.role || null;

      let ipAddress = null;
      let userAgent = null;

      if (req) {
        const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || null;
        if (rawIp && typeof rawIp === 'string') {
          // If there's a proxy chain (comma-separated list), take the first (client) IP
          const firstIp = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp;
          ipAddress = firstIp.substring(0, 100);
        } else {
          ipAddress = rawIp;
        }
        userAgent = req.headers['user-agent'] || null;
      }

      await query(
        `INSERT INTO audit_logs (
          actor_id, actor_name, actor_email, actor_role,
          action, module, record_id, record_name, description,
          changes, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          actorId,
          actorName,
          actorEmail,
          actorRole,
          action,
          module,
          recordId ? String(recordId) : null,
          recordName || null,
          description,
          JSON.stringify(changes),
          ipAddress,
          userAgent,
        ]
      );
    } catch (err) {
      console.error('❌ Failed to write audit log:', err.message);
    }
  },

  /**
   * List audit logs with pagination and filters.
   */
  async list({ search, module, action, dateFrom, dateTo, limit = 50, offset = 0 } = {}) {
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(
        `(actor_name ILIKE $${paramIndex} OR actor_email ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR record_name ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (module && module !== 'all') {
      whereClauses.push(`module = $${paramIndex}`);
      params.push(module);
      paramIndex++;
    }

    if (action && action !== 'all') {
      whereClauses.push(`action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (dateFrom) {
      whereClauses.push(`created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereClauses.push(`created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereSql}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated rows
    const queryParams = [...params, limit, offset];
    const limitIndex = paramIndex;
    const offsetIndex = paramIndex + 1;

    const rowsResult = await query(
      `SELECT * FROM audit_logs
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      queryParams
    );

    return {
      logs: rowsResult.rows,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  },

  /**
   * Get a single log by ID.
   */
  async getById(id) {
    const result = await query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * Helper utility to compare two objects and compute changes.
   */
  computeChanges(oldObj, newObj, ignoredFields = ['updated_at', 'created_at', 'password_hash', 'mfa_code', 'mfa_code_expires_at', 'temporary_password_hash']) {
    const changes = {};
    if (!oldObj || !newObj) return changes;

    for (const key in newObj) {
      if (ignoredFields.includes(key)) continue;

      const oldVal = oldObj[key];
      const newVal = newObj[key];

      // Deep compare using JSON.stringify for simplicity and consistency
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = {
          old: oldVal !== undefined ? oldVal : null,
          new: newVal !== undefined ? newVal : null,
        };
      }
    }
    return changes;
  }
};

export default AuditService;
