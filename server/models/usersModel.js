import { query } from '../config/db.js';

const UsersModel = {
  async findByEmail(email) {
    const result = await query(`
      SELECT u.*, r.permissions, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1
    `, [email]);
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await query(`
      SELECT u.*, r.permissions, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async findByMemberId(memberId) {
    const result = await query('SELECT * FROM users WHERE member_id = $1', [memberId]);
    return result.rows[0] || null;
  },

  async getAll() {
    const result = await query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.member_id, u.zone_id, u.created_at, u.role_id,
        u.mfa_enabled, u.must_change_password,
        r.name as role_name,
        m.first_name, m.last_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN members m ON u.member_id = m.id
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  },

  async create(data) {
    const { name, email, passwordHash, role, roleId, memberId, zoneId } = data;
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, role_id, member_id, zone_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name || null, email, passwordHash, role, roleId || null, memberId || null, zoneId || null]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const fieldMap = {
      name: 'name',
      email: 'email',
      passwordHash: 'password_hash',
      role: 'role',
      roleId: 'role_id',
      memberId: 'member_id',
      zoneId: 'zone_id',
      mfaEnabled: 'mfa_enabled',
      mfaCode: 'mfa_code',
      mfaCodeExpiresAt: 'mfa_code_expires_at',
      temporaryPasswordHash: 'temporary_password_hash',
      temporaryPasswordExpiresAt: 'temporary_password_expires_at',
      passwordResetRequestedAt: 'password_reset_requested_at',
      mustChangePassword: 'must_change_password',
    };

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [jsKey, dbColumn] of Object.entries(fieldMap)) {
      if (data[jsKey] !== undefined) {
        setClauses.push(`${dbColumn} = $${paramIndex}`);
        params.push(data[jsKey]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },
};

export default UsersModel;
