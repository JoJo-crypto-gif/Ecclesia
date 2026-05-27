import { query } from '../config/db.js';

const AttendanceModel = {
  // ─── Check in a member or visitor ──────────────────────
  async checkIn({ instanceId, memberId, visitorName, status = 'Present' }) {
    // If it's a member, use UPSERT to prevent duplicates
    if (memberId) {
      const result = await query(
        `INSERT INTO attendance (instance_id, member_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (instance_id, member_id)
         DO UPDATE SET status = $3, checked_in_at = NOW()
         RETURNING *`,
        [instanceId, memberId, status]
      );
      return result.rows[0];
    }
    
    // Visitor check-in (no unique constraint on visitor_name)
    const result = await query(
      `INSERT INTO attendance (instance_id, visitor_name, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [instanceId, visitorName, status]
    );
    return result.rows[0];
  },

  // ─── Get attendance for a specific instance ────────────
  async findByInstance(instanceId) {
    const result = await query(
      `SELECT a.*,
              m.first_name, m.last_name, m.email, m.phone, m.avatar_url, m.status as member_status
       FROM attendance a
       LEFT JOIN members m ON m.id = a.member_id
       WHERE a.instance_id = $1
       ORDER BY a.checked_in_at ASC`,
      [instanceId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      `SELECT a.*, ei.event_id, e.zone_id
       FROM attendance a
       JOIN event_instances ei ON ei.id = a.instance_id
       JOIN events e ON e.id = ei.event_id
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // ─── Remove a check-in record ──────────────────────────
  async remove(id) {
    const result = await query('DELETE FROM attendance WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  },

  // ─── Remove by instance + member ──────────────────────
  async removeByInstanceAndMember(instanceId, memberId) {
    const result = await query(
      'DELETE FROM attendance WHERE instance_id = $1 AND member_id = $2 RETURNING id',
      [instanceId, memberId]
    );
    return result.rows[0];
  },

  // ─── Get attendance stats ──────────────────────────────
  async getStats({ zoneId } = {}) {
    if (!zoneId) {
      const result = await query(`
        SELECT
          (SELECT COUNT(DISTINCT a.id) FROM attendance a) as total_checkins,
          (SELECT COUNT(DISTINCT a.member_id) FROM attendance a WHERE a.member_id IS NOT NULL) as unique_members,
          (SELECT COUNT(*) FROM attendance a WHERE a.visitor_name IS NOT NULL) as total_visitors,
          (SELECT COUNT(*) FROM event_instances WHERE status = 'completed') as completed_events,
          (SELECT COUNT(*) FROM event_instances WHERE status = 'scheduled' AND date >= CURRENT_DATE) as upcoming_events,
          COALESCE(
            (
              SELECT
                CASE
                  WHEN COUNT(DISTINCT ei.id) = 0 THEN 0
                  WHEN (SELECT COUNT(*) FROM members WHERE status = 'Active') = 0 THEN 0
                  ELSE
                    ROUND((COUNT(a.id)::numeric / COUNT(DISTINCT ei.id)::numeric) / (SELECT COUNT(*) FROM members WHERE status = 'Active')::numeric * 100)
                END
              FROM event_instances ei
              LEFT JOIN attendance a ON a.instance_id = ei.id
              WHERE ei.status = 'completed' AND ei.date >= CURRENT_DATE - INTERVAL '30 days'
            ), 0
          ) as avg_attendance_percentage
      `);
      return {
        ...result.rows[0],
        avg_attendance_percentage: parseInt(result.rows[0].avg_attendance_percentage, 10)
      };
    }

    const result = await query(
      `
        SELECT
          (SELECT COUNT(DISTINCT a.id)
             FROM attendance a
             JOIN event_instances ei ON ei.id = a.instance_id
             JOIN events e ON e.id = ei.event_id
            WHERE e.zone_id = $1) as total_checkins,
          (SELECT COUNT(DISTINCT a.member_id)
             FROM attendance a
             JOIN event_instances ei ON ei.id = a.instance_id
             JOIN events e ON e.id = ei.event_id
            WHERE a.member_id IS NOT NULL AND e.zone_id = $1) as unique_members,
          (SELECT COUNT(*)
             FROM attendance a
             JOIN event_instances ei ON ei.id = a.instance_id
             JOIN events e ON e.id = ei.event_id
            WHERE a.visitor_name IS NOT NULL AND e.zone_id = $1) as total_visitors,
          (SELECT COUNT(*)
             FROM event_instances ei
             JOIN events e ON e.id = ei.event_id
            WHERE ei.status = 'completed' AND e.zone_id = $1) as completed_events,
          (SELECT COUNT(*)
             FROM event_instances ei
             JOIN events e ON e.id = ei.event_id
            WHERE ei.status = 'scheduled' AND ei.date >= CURRENT_DATE AND e.zone_id = $1) as upcoming_events,
          COALESCE(
            (
              SELECT
                CASE
                  WHEN COUNT(DISTINCT ei.id) = 0 THEN 0
                  WHEN (SELECT COUNT(*) FROM members WHERE status = 'Active' AND zone_id = $1) = 0 THEN 0
                  ELSE
                    ROUND((COUNT(a.id)::numeric / COUNT(DISTINCT ei.id)::numeric) / (SELECT COUNT(*) FROM members WHERE status = 'Active' AND zone_id = $1)::numeric * 100)
                END
              FROM event_instances ei
              JOIN events e ON e.id = ei.event_id
              LEFT JOIN attendance a ON a.instance_id = ei.id
              WHERE ei.status = 'completed' AND ei.date >= CURRENT_DATE - INTERVAL '30 days' AND e.zone_id = $1
            ), 0
          ) as avg_attendance_percentage
      `,
      [zoneId]
    );
    return {
      ...result.rows[0],
      avg_attendance_percentage: parseInt(result.rows[0].avg_attendance_percentage, 10)
    };
  },

  // ─── Get attendance for a member across all events ─────
  async findByMember(memberId, { limit = 20 } = {}) {
    const result = await query(
      `SELECT a.*, ei.date, e.name as event_name, e.type as event_type
       FROM attendance a
       JOIN event_instances ei ON ei.id = a.instance_id
       JOIN events e ON e.id = ei.event_id
       WHERE a.member_id = $1
       ORDER BY ei.date DESC
       LIMIT $2`,
      [memberId, limit]
    );
    return result.rows;
  },

  // ─── Get attendance trends (weekly counts) ─────────────
  async getTrends(eventId, { weeks = 12 } = {}) {
    const result = await query(
      `SELECT ei.date, ei.status as instance_status,
              COUNT(a.id) as attendance_count
       FROM event_instances ei
       LEFT JOIN attendance a ON a.instance_id = ei.id
       WHERE ei.event_id = $1
         AND ei.date >= CURRENT_DATE - INTERVAL '${weeks} weeks'
       GROUP BY ei.id, ei.date, ei.status
       ORDER BY ei.date ASC`,
      [eventId]
    );
    return result.rows;
  },

  // ─── Get dynamic attendance trends ──────────────────────
  async getDynamicTrends({ period = 'month', eventId = null, limit = 12, zoneId } = {}) {
    let dateTrunc, interval;
    
    switch (period) {
      case 'week':
        dateTrunc = 'week';
        interval = `${limit} weeks`;
        break;
      case 'year':
        dateTrunc = 'year';
        interval = `${limit} years`;
        break;
      case 'month':
      default:
        dateTrunc = 'month';
        interval = `${limit} months`;
        break;
    }

    // Build WHERE clause
    let whereClause = `ei.date >= DATE_TRUNC('${dateTrunc}', CURRENT_DATE) - INTERVAL '${interval}' AND ei.date <= CURRENT_DATE`;
    const params = [];
    
    if (eventId && eventId !== 'all') {
      whereClause += ` AND ei.event_id = $1`;
      params.push(eventId);
    }
    if (zoneId) {
      whereClause += ` AND e.zone_id = $${params.length + 1}`;
      params.push(zoneId);
    }

    const queryStr = `
       SELECT DATE_TRUNC('${dateTrunc}', ei.date) as period_date,
              COUNT(a.id) as attendance_count
       FROM event_instances ei
       LEFT JOIN attendance a ON a.instance_id = ei.id
       JOIN events e ON e.id = ei.event_id
       WHERE ${whereClause}
       GROUP BY period_date
       ORDER BY period_date ASC
    `;

    const result = await query(queryStr, params);
    return result.rows;
  },

  // ─── Global trends (month names) ──────────────────────
  async getGlobalTrends({ months = 7, zoneId } = {}) {
    const params = [];
    let whereClause = `ei.date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${months} months' AND ei.date <= CURRENT_DATE`;

    if (zoneId) {
      params.push(zoneId);
      whereClause += ` AND e.zone_id = $1`;
    }

    const result = await query(
      `
        SELECT TO_CHAR(DATE_TRUNC('month', ei.date), 'Mon') as month_name,
               COUNT(a.id) as attendance_count,
               DATE_TRUNC('month', ei.date) as month_date
        FROM event_instances ei
        LEFT JOIN attendance a ON a.instance_id = ei.id
        JOIN events e ON e.id = ei.event_id
        WHERE ${whereClause}
        GROUP BY month_name, month_date
        ORDER BY month_date ASC
      `,
      params
    );
    return result.rows;
  },

  // ─── Get Member Attendance Analytics ────────────────────
  async getMemberAnalytics(memberId) {
    const result = await query(`
      WITH member_info AS (
        SELECT
          zone_id,
          COALESCE(join_date::date, '1970-01-01'::date) AS join_date
        FROM members
        WHERE id = $1
      ),
      eligible_instances AS (
        SELECT
          ei.id,
          ei.date,
          e.type
        FROM event_instances ei
        JOIN events e ON e.id = ei.event_id
        CROSS JOIN member_info mi
        WHERE ei.date >= mi.join_date
          AND ei.date <= CURRENT_DATE
          AND ei.status <> 'cancelled'
          AND (mi.zone_id IS NULL OR e.zone_id = mi.zone_id OR e.zone_id IS NULL)
      ),
      attended_instances AS (
        SELECT
          ei.id,
          ei.date,
          e.type
        FROM event_instances ei
        JOIN events e ON e.id = ei.event_id
        JOIN attendance a
          ON a.instance_id = ei.id
         AND a.member_id = $1
        WHERE ei.status <> 'cancelled'
      ),
      total_events AS (
        SELECT COUNT(*)::int AS possible
        FROM eligible_instances
      ),
      attended AS (
        SELECT COUNT(*)::int AS total
        FROM attended_instances
      ),
      by_type AS (
        SELECT type, COUNT(*)::int AS count
        FROM attended_instances
        GROUP BY type
      ),
      month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
          DATE_TRUNC('month', CURRENT_DATE),
          INTERVAL '1 month'
        )::date AS month_start
      ),
      by_month AS (
        SELECT
          TO_CHAR(ms.month_start, 'Mon') AS month,
          ms.month_start AS month_date,
          COALESCE(COUNT(ai.id), 0)::int AS count
        FROM month_series ms
        LEFT JOIN attended_instances ai
          ON DATE_TRUNC('month', ai.date) = ms.month_start
        GROUP BY ms.month_start
        ORDER BY ms.month_start ASC
      )
      SELECT
        (SELECT possible FROM total_events) AS total_possible,
        (SELECT total FROM attended) AS total_attended,
        (
          SELECT COALESCE(json_agg(row_to_json(bt)), '[]'::json)
          FROM (
            SELECT * FROM by_type ORDER BY count DESC, type ASC
          ) bt
        ) AS by_event_type,
        (
          SELECT COALESCE(json_agg(row_to_json(bm)), '[]'::json)
          FROM (
            SELECT month, month_date, count FROM by_month ORDER BY month_date ASC
          ) bm
        ) AS monthly_trend
    `, [memberId]);
    return result.rows[0];
  },

  // ─── Find Member by ID, Email, or Phone ────────────────
  async findMemberByIdentifier(identifier, { zoneId } = {}) {
    const value = identifier.trim();
    if (!value) return null;

    const params = [value];
    const zoneFilter = zoneId ? ` AND zone_id = $${params.push(zoneId)}` : '';
    const result = await query(
      `SELECT * FROM members 
       WHERE (
         id::text = $1 
         OR LOWER(email) = LOWER($1) 
         OR phone = $1
       )
       ${zoneFilter}
       LIMIT 1`,
      params
    );
    return result.rows[0];
  },

  // ─── Find Member by Email or Phone (public-safe lookup) ─
  async findMemberByContactIdentifier(identifier, { zoneId } = {}) {
    const value = identifier.trim();
    if (!value) return null;

    const params = [value];
    const zoneFilter = zoneId ? ` AND zone_id = $${params.push(zoneId)}` : '';
    const result = await query(
      `SELECT * FROM members
       WHERE (
         LOWER(email) = LOWER($1)
         OR phone = $1
       )
       ${zoneFilter}
       LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  },

  async findMemberById(memberId) {
    const result = await query('SELECT * FROM members WHERE id = $1 LIMIT 1', [memberId]);
    return result.rows[0] || null;
  },

  // ─── Zone Health Leaderboard ───────────────────────────
  async getZoneHealth({ zoneId } = {}) {
    const params = [];
    let whereClause = '';
    if (zoneId) {
      params.push(zoneId);
      whereClause = 'WHERE z.id = $1';
    }
    const result = await query(`
      WITH zone_stats AS (
        SELECT
          z.id,
          z.name,
          COUNT(DISTINCT m.id)::int AS total_members,
          COUNT(DISTINCT CASE
            WHEN a.id IS NOT NULL AND m.status = 'Active' THEN m.id
          END)::int AS active_attendees,
          COUNT(a.id)::int AS total_checkins
        FROM zones z
        LEFT JOIN members m ON m.zone_id = z.id
        LEFT JOIN attendance a ON a.member_id = m.id
          AND a.checked_in_at >= CURRENT_DATE - INTERVAL '3 months'
        ${whereClause}
        GROUP BY z.id, z.name
      )
      SELECT *,
        CASE WHEN total_members > 0
          THEN ROUND((active_attendees::numeric / total_members::numeric) * 100, 1)
          ELSE 0
        END AS engagement_rate
      FROM zone_stats
      ORDER BY engagement_rate DESC
    `, params);
    return result.rows;
  },

  // ─── Demographics vs Attendance ────────────────────────
  async getDemographicAttendance({ zoneId } = {}) {
    const params = [];
    let whereClause = "WHERE m.status IS DISTINCT FROM 'Ex-member'";
    if (zoneId) {
      params.push(zoneId);
      whereClause += " AND m.zone_id = $1";
    }
    const result = await query(`
      WITH member_ages AS (
        SELECT
          m.id,
          CASE
            WHEN m.dob IS NULL THEN 'Unknown'
            WHEN EXTRACT(YEAR FROM AGE(m.dob)) < 18 THEN 'Under 18'
            WHEN EXTRACT(YEAR FROM AGE(m.dob)) BETWEEN 18 AND 25 THEN '18-25'
            WHEN EXTRACT(YEAR FROM AGE(m.dob)) BETWEEN 26 AND 35 THEN '26-35'
            WHEN EXTRACT(YEAR FROM AGE(m.dob)) BETWEEN 36 AND 45 THEN '36-45'
            WHEN EXTRACT(YEAR FROM AGE(m.dob)) BETWEEN 46 AND 60 THEN '46-60'
            WHEN EXTRACT(YEAR FROM AGE(m.dob)) > 60 THEN '60+'
          END AS age_group
        FROM members m
        ${whereClause}
      ),
      attendance_counts AS (
        SELECT
          ma.age_group,
          COUNT(DISTINCT ma.id)::int AS total_members,
          COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN ma.id END)::int AS active_attendees,
          COUNT(a.id)::int AS total_checkins
        FROM member_ages ma
        LEFT JOIN attendance a ON a.member_id = ma.id
          AND a.checked_in_at >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY ma.age_group
      )
      SELECT *,
        CASE WHEN total_members > 0
          THEN ROUND((active_attendees::numeric / total_members::numeric) * 100, 1)
          ELSE 0
        END AS engagement_rate
      FROM attendance_counts
      ORDER BY
        CASE age_group
          WHEN 'Under 18' THEN 1
          WHEN '18-25' THEN 2
          WHEN '26-35' THEN 3
          WHEN '36-45' THEN 4
          WHEN '46-60' THEN 5
          WHEN '60+' THEN 6
          ELSE 7
        END
    `, params);
    return result.rows;
  },

  // ─── Report Overview Stats ─────────────────────────────
  async getReportOverview({ zoneId } = {}) {
    const params = [];
    let membersWhere = "WHERE status = 'Active'";
    let eventsWhere = "WHERE ei.status = 'completed'";
    let checkinsWhere = "";
    let eventJoin = "";
    
    if (zoneId) {
      params.push(zoneId);
      membersWhere += " AND zone_id = $1";
      eventsWhere += " AND e.zone_id = $1";
      checkinsWhere = "JOIN event_instances ei ON a.instance_id = ei.id JOIN events e ON ei.event_id = e.id WHERE e.zone_id = $1";
      eventJoin = "JOIN events e ON e.id = ei.event_id";
    }

    const result = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM members ${membersWhere}) AS total_active_members,
        (SELECT COUNT(*)::int FROM event_instances ei ${zoneId ? eventJoin : ''} ${eventsWhere}) AS total_completed_events,
        (SELECT COUNT(*)::int FROM attendance a ${checkinsWhere}) AS total_checkins,
        COALESCE(
          (
            SELECT
              CASE
                WHEN COUNT(DISTINCT ei.id) = 0 THEN 0
                WHEN (SELECT COUNT(*) FROM members ${membersWhere}) = 0 THEN 0
                ELSE
                  ROUND((COUNT(a.id)::numeric / COUNT(DISTINCT ei.id)::numeric) / (SELECT COUNT(*) FROM members ${membersWhere})::numeric * 100)
              END
            FROM event_instances ei
            ${zoneId ? eventJoin : ''}
            LEFT JOIN attendance a ON a.instance_id = ei.id
            WHERE ei.status = 'completed' AND ei.date >= CURRENT_DATE - INTERVAL '30 days' ${zoneId ? 'AND e.zone_id = $1' : ''}
          ), 0
        )::int AS avg_attendance_percentage
    `, params);
    return result.rows[0];
  },
};

export default AttendanceModel;
