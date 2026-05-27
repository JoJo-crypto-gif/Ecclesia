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
        other_name ILIKE $${paramIndex} OR
        titles::text ILIKE $${paramIndex} OR
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
      firstName, lastName, otherName, titles, email, phone, address, status,
      zoneId, joinDate, avatarUrl, notes, dob, gender,
      role, occupation, emergencyContact, emergencyPhone, discoverySource,
      maritalStatus, marriageDate, spouseName, spousePhone,
      motherName, motherStatus, fatherName, fatherStatus,
      isBaptized, baptismDate, baptizedBy, baptismMethod, baptismChurch,
      children, exMemberReason, landmark, whatsapp, spouseChurch, homeTown, brothersKeeper,
      education, interest
    } = data;

    const result = await query(
      `INSERT INTO members (
        first_name, last_name, other_name, titles, email, phone, address, status,
        zone_id, join_date, avatar_url, notes, dob, gender,
        role, occupation, emergency_contact, emergency_phone, discovery_source,
        marital_status, marriage_date, spouse_name, spouse_phone,
        mother_name, mother_status, father_name, father_status,
        is_baptized, baptism_date, baptized_by, baptism_method, baptism_church,
        children, ex_member_reason, landmark, whatsapp, spouse_church, home_town, brothers_keeper,
        education, interest
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27,
        $28, $29, $30, $31, $32,
        $33, $34, $35, $36, $37, $38, $39,
        $40, $41
      ) RETURNING *`,
      [
        firstName, lastName, otherName || null, JSON.stringify(Array.isArray(titles) ? titles : []),
        email, phone || null, address || null, status || 'Active',
        zoneId || null, joinDate || new Date().toISOString().split('T')[0],
        avatarUrl || null, notes || null, dob || null, gender || null,
        role || null, occupation || null, emergencyContact || null, emergencyPhone || null,
        discoverySource || null, maritalStatus || null, marriageDate || null, spouseName || null, spousePhone || null,
        motherName || null, motherStatus || null, fatherName || null, fatherStatus || null,
        isBaptized || false, baptismDate || null, baptizedBy || null, baptismMethod || null, baptismChurch || null,
        JSON.stringify(children || []), exMemberReason || null,
        landmark || null, whatsapp || null, spouseChurch || null, homeTown || null, brothersKeeper || null,
        education || null, interest || null
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
      otherName: 'other_name',
      titles: 'titles',
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
      exMemberReason: 'ex_member_reason',
      landmark: 'landmark',
      whatsapp: 'whatsapp',
      spouseChurch: 'spouse_church',
      homeTown: 'home_town',
      brothersKeeper: 'brothers_keeper',
      education: 'education',
      interest: 'interest',
    };

    const setClauses = [];
    const params = [];
    let paramIndex = 1;
    const jsonFields = new Set(['children', 'titles']);

    for (const [jsKey, dbColumn] of Object.entries(fieldMap)) {
      if (data[jsKey] !== undefined) {
        setClauses.push(`${dbColumn} = $${paramIndex}`);
        if (jsonFields.has(jsKey)) {
          params.push(
            jsKey === 'titles'
              ? JSON.stringify(Array.isArray(data[jsKey]) ? data[jsKey] : [])
              : JSON.stringify(data[jsKey] || [])
          );
        } else {
          params.push(data[jsKey]);
        }
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
    const isBaptismAnniversary = type === 'baptism_anniversary';
    const isAnniversary = type === 'anniversary';
    const dateColumn = isBaptismAnniversary ? 'baptism_date' : (isAnniversary ? 'marriage_date' : 'dob');
    const params = [];
    let paramIndex = 1;
    let whereClause = `WHERE status = 'Active' AND ${dateColumn} IS NOT NULL`;

    if (isAnniversary) {
      whereClause += ` AND marital_status = 'Married'`;
    }

    if (isBaptismAnniversary) {
      whereClause += ` AND is_baptized = true`;
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
        ${isAnniversary ? ', marriage_date, marital_status' : ''}
        ${isBaptismAnniversary ? ', baptism_date' : ''}
        ${!isAnniversary && !isBaptismAnniversary ? ', dob' : ''}
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

    // Get zone distribution
    const zoneDistributionResult = await query(`
      SELECT COALESCE(z.name, 'Unassigned') as name, COUNT(m.id)::int as count
      FROM members m
      LEFT JOIN zones z ON m.zone_id = z.id
      ${whereClause.replace('WHERE', 'WHERE m.')}
      GROUP BY z.name
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
      zoneDistribution: zoneDistributionResult.rows,
    };
  },

  /**
   * Get historical non-ex-member count by age group over the last 6 months.
   */
  async getAgeTrends(zoneId) {
    const params = [];
    let zoneFilter = '';
    if (zoneId) {
      params.push(zoneId);
      zoneFilter = 'AND m.zone_id = $1';
    }

    const queryStr = `
      WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
          DATE_TRUNC('month', CURRENT_DATE),
          INTERVAL '1 month'
        )::date AS month_date
      ),
      member_monthly_ages AS (
        SELECT
          ms.month_date,
          TO_CHAR(ms.month_date, 'Mon YYYY') as period_name,
          m.id,
          CASE
            WHEN m.dob IS NULL THEN 'Unknown'
            WHEN EXTRACT(YEAR FROM AGE(ms.month_date, m.dob)) < 18 THEN 'Under 18'
            WHEN EXTRACT(YEAR FROM AGE(ms.month_date, m.dob)) BETWEEN 18 AND 25 THEN '18-25'
            WHEN EXTRACT(YEAR FROM AGE(ms.month_date, m.dob)) BETWEEN 26 AND 35 THEN '26-35'
            WHEN EXTRACT(YEAR FROM AGE(ms.month_date, m.dob)) BETWEEN 36 AND 45 THEN '36-45'
            WHEN EXTRACT(YEAR FROM AGE(ms.month_date, m.dob)) BETWEEN 46 AND 60 THEN '46-60'
            WHEN EXTRACT(YEAR FROM AGE(ms.month_date, m.dob)) > 60 THEN '60+'
          END AS age_group
        FROM month_series ms
        LEFT JOIN members m ON m.status IS DISTINCT FROM 'Ex-member'
          AND m.join_date <= (ms.month_date + INTERVAL '1 month' - INTERVAL '1 day')::date
          ${zoneFilter}
      )
      SELECT
        period_name as name,
        month_date,
        COALESCE(COUNT(CASE WHEN age_group = 'Under 18' THEN 1 END), 0)::int AS "Under 18",
        COALESCE(COUNT(CASE WHEN age_group = '18-25' THEN 1 END), 0)::int AS "18-25",
        COALESCE(COUNT(CASE WHEN age_group = '26-35' THEN 1 END), 0)::int AS "26-35",
        COALESCE(COUNT(CASE WHEN age_group = '36-45' THEN 1 END), 0)::int AS "36-45",
        COALESCE(COUNT(CASE WHEN age_group = '46-60' THEN 1 END), 0)::int AS "46-60",
        COALESCE(COUNT(CASE WHEN age_group = '60+' THEN 1 END), 0)::int AS "60+"
      FROM member_monthly_ages
      GROUP BY month_date, period_name
      ORDER BY month_date ASC;
    `;

    const result = await query(queryStr, params);
    return result.rows;
  },
};

export default MembersModel;
