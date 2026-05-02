import { query } from '../config/db.js';

/**
 * Members data access layer — all SQL queries live here.
 */
const MembersModel = {
  /**
   * Get all members with optional search and filter.
   */
  async findAll({ search, status, zoneId, isBaptized, gender, limit = 100, offset = 0 } = {}) {
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

    if (isBaptized !== undefined && isBaptized !== null && isBaptized !== '') {
      conditions.push(`is_baptized = $${paramIndex}`);
      params.push(isBaptized === 'true' || isBaptized === true);
      paramIndex++;
    }

    if (gender) {
      conditions.push(`gender = $${paramIndex}`);
      params.push(gender);
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
      maritalStatus, marriageDate, spouseName, spousePhone,
      motherName, motherStatus, fatherName, fatherStatus,
      isBaptized, baptismDate, baptizedBy, baptismMethod, baptismChurch,
      children
    } = data;

    const result = await query(
      `INSERT INTO members (
        first_name, last_name, email, phone, address, status,
        zone_id, join_date, avatar_url, notes, dob, gender,
        role, occupation, emergency_contact, emergency_phone, discovery_source,
        marital_status, marriage_date, spouse_name, spouse_phone,
        mother_name, mother_status, father_name, father_status,
        is_baptized, baptism_date, baptized_by, baptism_method, baptism_church,
        children
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31
      ) RETURNING *`,
      [
        firstName, lastName, email, phone || null, address || null,
        status || 'Active', zoneId || null, joinDate || new Date().toISOString().split('T')[0],
        avatarUrl || null, notes || null, dob || null, gender || null,
        role || null, occupation || null, emergencyContact || null, emergencyPhone || null,
        discoverySource || null, maritalStatus || null, marriageDate || null, spouseName || null, spousePhone || null,
        motherName || null, motherStatus || null, fatherName || null, fatherStatus || null,
        isBaptized || false, baptismDate || null, baptizedBy || null, baptismMethod || null, baptismChurch || null,
        JSON.stringify(children || [])
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
      spouseName: 'spouse_name',
      spousePhone: 'spouse_phone',
      motherName: 'mother_name',
      motherStatus: 'mother_status',
      fatherName: 'father_name',
      fatherStatus: 'father_status',
      isBaptized: 'is_baptized',
      baptismDate: 'baptism_date',
      baptizedBy: 'baptized_by',
      baptismMethod: 'baptism_method',
      baptismChurch: 'baptism_church',
      children: 'children',
    };

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [jsKey, dbColumn] of Object.entries(fieldMap)) {
      if (data[jsKey] !== undefined) {
        setClauses.push(`${dbColumn} = $${paramIndex}`);
        // JSONB fields need to be stringified
        params.push(jsKey === 'children' ? JSON.stringify(data[jsKey]) : data[jsKey]);
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
        COUNT(*) FILTER (WHERE status = 'Visitor') as visitor,
        COUNT(*) FILTER (WHERE is_baptized = false OR is_baptized IS NULL) as unbaptized,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_total_30d,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days') as new_total_prev_30d,
        COUNT(*) FILTER (WHERE status = 'Active' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as new_active_30d,
        COUNT(*) FILTER (WHERE status = 'Active' AND created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days') as new_active_prev_30d
      FROM members ${whereClause}
    `, params);
    
    const discoveryResult = await query(`
      SELECT COALESCE(discovery_source, 'Unknown') as name, COUNT(*)::int as value
      FROM members ${whereClause}
      GROUP BY discovery_source
    `, params);
    
    const row = result.rows[0];
    const total = parseInt(row.total, 10);
    const active = parseInt(row.active, 10);
    const inactive = parseInt(row.inactive, 10);
    const visitor = parseInt(row.visitor, 10);
    const unbaptized = parseInt(row.unbaptized, 10);

    const newTotal30d = parseInt(row.new_total_30d, 10);
    const newTotalPrev30d = parseInt(row.new_total_prev_30d, 10);
    let totalMembersTrend = 0;
    if (newTotalPrev30d > 0) {
      totalMembersTrend = Math.round(((newTotal30d - newTotalPrev30d) / newTotalPrev30d) * 100);
    } else if (newTotal30d > 0) {
      totalMembersTrend = 100; // If there were 0 before, and now there are some, it's a 100% increase
    }

    const newActive30d = parseInt(row.new_active_30d, 10);
    const newActivePrev30d = parseInt(row.new_active_prev_30d, 10);
    let activeMembersTrend = 0;
    if (newActivePrev30d > 0) {
      activeMembersTrend = Math.round(((newActive30d - newActivePrev30d) / newActivePrev30d) * 100);
    } else if (newActive30d > 0) {
      activeMembersTrend = 100;
    }

    return {
      total,
      active,
      inactive,
      visitor,
      unbaptized,
      totalMembersTrend,
      activeMembersTrend,
      discoveryDistribution: discoveryResult.rows,
    };
  },
};

export default MembersModel;
