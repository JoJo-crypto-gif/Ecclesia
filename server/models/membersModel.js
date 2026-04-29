import { query } from '../config/db.js';

/**
 * Members data access layer — all SQL queries live here.
 */
const MembersModel = {
  /**
   * Get all members with optional search and filter.
   */
  async findAll({ search, status, zoneId, limit = 100, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        phone ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (zoneId) {
      conditions.push(`zone_id = $${paramIndex}`);
      params.push(zoneId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM members ${whereClause}`,
      params
    );

    // Get paginated results
    const dataResult = await query(
      `SELECT * FROM members ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      members: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset,
    };
  },

  /**
   * Find a single member by ID.
   */
  async findById(id) {
    const result = await query('SELECT * FROM members WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * Find a member by email.
   */
  async findByEmail(email) {
    const result = await query('SELECT * FROM members WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  /**
   * Create a new member.
   */
  async create(data) {
    const {
      firstName, lastName, email, phone, address, status,
      zoneId, joinDate, avatarUrl, notes, dob, gender,
      role, occupation, emergencyContact, emergencyPhone, discoverySource,
      maritalStatus, marriageDate
    } = data;

    const result = await query(
      `INSERT INTO members (
        first_name, last_name, email, phone, address, status,
        zone_id, join_date, avatar_url, notes, dob, gender,
        role, occupation, emergency_contact, emergency_phone, discovery_source,
        marital_status, marriage_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19
      ) RETURNING *`,
      [
        firstName, lastName, email, phone || null, address || null,
        status || 'Active', zoneId || null, joinDate || new Date().toISOString().split('T')[0],
        avatarUrl || null, notes || null, dob || null, gender || null,
        role || null, occupation || null, emergencyContact || null, emergencyPhone || null,
        discoverySource || null, maritalStatus || null, marriageDate || null
      ]
    );

    return result.rows[0];
  },

  /**
   * Update an existing member.
   */
  async update(id, data) {
    // Build SET clause dynamically from provided fields
    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      address: 'address',
      status: 'status',
      zoneId: 'zone_id',
      joinDate: 'join_date',
      avatarUrl: 'avatar_url',
      notes: 'notes',
      dob: 'dob',
      gender: 'gender',
      role: 'role',
      occupation: 'occupation',
      emergencyContact: 'emergency_contact',
      emergencyPhone: 'emergency_phone',
      discoverySource: 'discovery_source',
      maritalStatus: 'marital_status',
      marriageDate: 'marriage_date',
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

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    // Always update the updated_at timestamp
    setClauses.push(`updated_at = NOW()`);

    params.push(id);
    const result = await query(
      `UPDATE members SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0] || null;
  },

  /**
   * Delete a member by ID.
   */
  async delete(id) {
    const result = await query(
      'DELETE FROM members WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get members with birthdays in a specific month.
   */
  async getBirthdaysByMonth(monthIndex, zoneId) {
    let whereClause = `WHERE dob IS NOT NULL AND status = 'Active' AND EXTRACT(MONTH FROM dob) = $1`;
    const params = [monthIndex];
    if (zoneId) {
      whereClause += ` AND zone_id = $2`;
      params.push(zoneId);
    }

    const queryStr = `
      SELECT id, first_name, last_name, avatar_url, dob
      FROM members 
      ${whereClause} 
      ORDER BY EXTRACT(DAY FROM dob) ASC
    `;
    const result = await query(queryStr, params);
    return result.rows;
  },

  /**
   * Get members eligible for a celebration type.
   */
  async getCelebrationMembers(type, zoneId) {
    const dateColumn = type === 'anniversary' ? 'marriage_date' : 'dob';
    const isAnniversary = type === 'anniversary';
    const params = [];
    let paramIndex = 1;
    let whereClause = `WHERE status = 'Active' AND ${dateColumn} IS NOT NULL`;

    if (isAnniversary) {
      whereClause += ` AND marital_status = 'Married'`;
    }

    if (zoneId) {
      whereClause += ` AND zone_id = $${paramIndex}`;
      params.push(zoneId);
      paramIndex++;
    }

    const result = await query(
      `
      SELECT
        id,
        first_name,
        last_name,
        avatar_url
        ${isAnniversary ? ', marriage_date, marital_status' : ', dob'}
      FROM members
      ${whereClause}
      ORDER BY first_name ASC, last_name ASC
      `,
      params
    );

    return result.rows;
  },

  /**
   * Get member statistics for dashboard.
   */
  async getStats(zoneId) {
    let whereClause = '';
    const params = [];
    
    if (zoneId) {
      whereClause = 'WHERE zone_id = $1';
      params.push(zoneId);
    }
    
    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Active') as active,
        COUNT(*) FILTER (WHERE status = 'Inactive') as inactive,
        COUNT(*) FILTER (WHERE status = 'Visitor') as visitor
      FROM members ${whereClause}
    `, params);
    
    const discoveryResult = await query(`
      SELECT COALESCE(discovery_source, 'Unknown') as name, COUNT(*)::int as value
      FROM members ${whereClause}
      GROUP BY discovery_source
    `, params);
    
    return {
      total: parseInt(result.rows[0].total, 10),
      active: parseInt(result.rows[0].active, 10),
      inactive: parseInt(result.rows[0].inactive, 10),
      visitor: parseInt(result.rows[0].visitor, 10),
      discoveryDistribution: discoveryResult.rows,
    };
  },
};

export default MembersModel;
