import { query } from '../config/db.js';

const ZonesModel = {
  async findAll() {
    const result = await query(`
      SELECT z.*, (
        SELECT COUNT(*)::int FROM members m WHERE m.zone_id = z.id
      ) as member_count
      FROM zones z ORDER BY name ASC
    `);
    return result.rows;
  },

  async findById(id) {
    const result = await query('SELECT * FROM zones WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByName(name) {
    const result = await query('SELECT * FROM zones WHERE name = $1', [name]);
    return result.rows[0] || null;
  },

  async create(data) {
    const { name, leaderId, description, meetingTime } = data;
    const result = await query(
      `INSERT INTO zones (name, leader_id, description, meeting_time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, leaderId || null, description || null, meetingTime || null]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const fieldMap = {
      name: 'name',
      leaderId: 'leader_id',
      description: 'description',
      meetingTime: 'meeting_time',
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

    setClauses.push(`updated_at = NOW()`);
    params.push(id);
    
    const result = await query(
      `UPDATE zones SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await query('DELETE FROM zones WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }
};

export default ZonesModel;
