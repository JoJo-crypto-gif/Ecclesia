import { query } from '../config/db.js';

const RolesModel = {
  async getAll() {
    const result = await query('SELECT * FROM roles ORDER BY name ASC');
    return result.rows;
  },

  async getById(id) {
    const result = await query('SELECT * FROM roles WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async getByName(name) {
    const result = await query('SELECT * FROM roles WHERE name = $1', [name]);
    return result.rows[0] || null;
  },

  async create(data) {
    const { name, description, permissions, isSystem = false } = data;
    const result = await query(
      `INSERT INTO roles (name, description, permissions, is_system)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, JSON.stringify(permissions || {}), isSystem]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const { name, description, permissions } = data;
    const result = await query(
      `UPDATE roles 
       SET name = $1, description = $2, permissions = $3, updated_at = NOW()
       WHERE id = $4 AND is_system = false
       RETURNING *`,
      [name, description || null, JSON.stringify(permissions || {}), id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    // Only delete if NOT a system role
    const result = await query('DELETE FROM roles WHERE id = $1 AND is_system = false RETURNING *', [id]);
    return result.rowCount > 0;
  }
};

export default RolesModel;
