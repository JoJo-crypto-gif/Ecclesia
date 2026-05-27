import { query } from '../config/db.js';

const formatDateYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EventsModel = {
  // ─── Create an event template ──────────────────────────
  async create({ name, type, location, startTime, isRecurring, recurrenceRule, dayOfWeek, zoneId }) {
    const result = await query(
      `INSERT INTO events (name, type, location, start_time, is_recurring, recurrence_rule, day_of_week, zone_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, type || 'Service', location, startTime, isRecurring || false, recurrenceRule, dayOfWeek, zoneId || null]
    );
    return result.rows[0];
  },

  // ─── List all event templates ──────────────────────────
  async findAll({ type, isActive, zoneId, includeGlobal = true } = {}) {
    let whereClause = '';
    const params = [];
    const conditions = [];

    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }
    if (isActive !== undefined) {
      params.push(isActive);
      conditions.push(`is_active = $${params.length}`);
    }
    if (zoneId) {
      params.push(zoneId);
      if (includeGlobal) {
        conditions.push(`(zone_id = $${params.length} OR zone_id IS NULL)`);
      } else {
        conditions.push(`zone_id = $${params.length}`);
      }
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const result = await query(
      `SELECT * FROM events ${whereClause} ORDER BY created_at DESC`,
      params
    );
    return result.rows;
  },

  // ─── Get a single event template ───────────────────────
  async findById(id) {
    const result = await query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows[0];
  },

  // ─── Update an event template ──────────────────────────
  async update(id, { name, type, location, startTime, isRecurring, recurrenceRule, dayOfWeek, isActive, zoneId }) {
    const result = await query(
      `UPDATE events
       SET name = COALESCE($2, name),
           type = COALESCE($3, type),
           location = COALESCE($4, location),
           start_time = COALESCE($5, start_time),
           is_recurring = COALESCE($6, is_recurring),
           recurrence_rule = COALESCE($7, recurrence_rule),
           day_of_week = COALESCE($8, day_of_week),
           is_active = COALESCE($9, is_active),
           zone_id = COALESCE($10, zone_id),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, type, location, startTime, isRecurring, recurrenceRule, dayOfWeek, isActive, zoneId]
    );
    return result.rows[0];
  },

  // ─── Delete an event template (cascades instances + attendance) ──
  async delete(id) {
    const result = await query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  },

  // ═══ EVENT INSTANCES ═══════════════════════════════════

  // ─── Create a single instance ──────────────────────────
  async createInstance(eventId, date, notes) {
    const result = await query(
      `INSERT INTO event_instances (event_id, date, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, date) DO NOTHING
       RETURNING *`,
      [eventId, date, notes]
    );
    return result.rows[0];
  },

  // ─── List instances for a specific event ───────────────
  async findInstances(eventId, { status, limit, fromDate, toDate } = {}) {
    const params = [eventId];
    const conditions = ['ei.event_id = $1'];

    if (status) {
      params.push(status);
      conditions.push(`ei.status = $${params.length}`);
    }
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`ei.date >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`ei.date <= $${params.length}`);
    }

    const limitClause = Number.isFinite(limit) ? `LIMIT $${params.push(limit)}` : '';
    const result = await query(
      `SELECT ei.*, e.name as event_name, e.type as event_type, e.start_time, e.is_recurring, e.zone_id,
              (SELECT COUNT(*) FROM attendance a WHERE a.instance_id = ei.id) as attendance_count,
              ei.name_override, ei.type_override, ei.location_override
       FROM event_instances ei
       JOIN events e ON e.id = ei.event_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ei.date DESC
       ${limitClause}`,
      params
    );
    return result.rows;
  },

  // ─── Get all instances across all events (for calendar) ──
  async findAllInstances({ fromDate, toDate, zoneId, includeGlobal = true } = {}) {
    const params = [];
    const conditions = [];

    if (fromDate) {
      params.push(fromDate);
      conditions.push(`ei.date >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`ei.date <= $${params.length}`);
    }
    if (zoneId) {
      params.push(zoneId);
      if (includeGlobal) {
        conditions.push(`(e.zone_id = $${params.length} OR e.zone_id IS NULL)`);
      } else {
        conditions.push(`e.zone_id = $${params.length}`);
      }
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await query(
      `SELECT ei.*, e.name as event_name, e.type as event_type, e.start_time, e.is_recurring, e.location, e.zone_id,
              (SELECT COUNT(*) FROM attendance a WHERE a.instance_id = ei.id) as attendance_count,
              ei.name_override, ei.type_override, ei.location_override
       FROM event_instances ei
       JOIN events e ON e.id = ei.event_id
       ${whereClause}
       ORDER BY ei.date ASC`,
      params
    );
    return result.rows;
  },

  // ─── Update instance status and overrides (cancel, complete, rename, relocate)
  async updateInstance(instanceId, { status, notes, date, nameOverride, typeOverride, locationOverride }) {
    const result = await query(
      `UPDATE event_instances
       SET status = COALESCE($2, status),
           notes = COALESCE($3, notes),
           date = COALESCE($4, date),
           name_override = CASE WHEN $5::text = '' THEN NULL ELSE COALESCE($5, name_override) END,
           type_override = CASE WHEN $6::text = '' THEN NULL ELSE COALESCE($6, type_override) END,
           location_override = CASE WHEN $7::text = '' THEN NULL ELSE COALESCE($7, location_override) END,
           completed_at = CASE WHEN $2 = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END
       WHERE id = $1
       RETURNING *`,
      [instanceId, status, notes, date, nameOverride, typeOverride, locationOverride]
    );
    return result.rows[0];
  },

  // ─── Get a single instance ─────────────────────────────
  async findInstanceById(instanceId) {
    const result = await query(
      `SELECT ei.*, e.name as event_name, e.type as event_type, e.start_time, e.is_recurring, e.location, e.zone_id,
       ei.name_override, ei.type_override, ei.location_override
       FROM event_instances ei
       JOIN events e ON e.id = ei.event_id
       WHERE ei.id = $1`,
      [instanceId]
    );
    return result.rows[0];
  },

  async findEventByInstanceId(instanceId) {
    const result = await query(
      `SELECT e.*
       FROM event_instances ei
       JOIN events e ON e.id = ei.event_id
       WHERE ei.id = $1`,
      [instanceId]
    );
    return result.rows[0] || null;
  },

  // ─── Delete an instance ────────────────────────────────
  async deleteInstance(instanceId) {
    const result = await query('DELETE FROM event_instances WHERE id = $1 RETURNING id', [instanceId]);
    return result.rows[0];
  },

  // ─── Sync past scheduled instances (background task) ────
  async syncPastScheduledInstances() {
    const result = await query(
      `UPDATE event_instances
       SET status = 'completed',
           completed_at = COALESCE(completed_at, NOW())
       WHERE status = 'scheduled' AND date < CURRENT_DATE`
    );
    return result.rowCount || 0;
  },

  // ─── Generate instances for a recurring event ──────────
  async generateInstances(eventId, weeks = 52) {
    const event = await this.findById(eventId);
    if (!event || !event.is_recurring) return [];

    const created = [];
    const startDate = new Date();
    const dateOnlyStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const recurrence = event.recurrence_rule;
    let occurrenceCount = weeks;

    if (recurrence === 'biweekly') {
      occurrenceCount = Math.max(1, Math.ceil(weeks / 2));
    } else if (recurrence === 'monthly') {
      occurrenceCount = Math.max(1, Math.ceil(weeks / 4));
    } else if (recurrence === 'yearly') {
      occurrenceCount = Math.max(1, Math.ceil(weeks / 52));
    }
    
    for (let i = 0; i < occurrenceCount; i++) {
      let targetDate;
      
      if (event.recurrence_rule === 'weekly' || event.recurrence_rule === 'biweekly') {
        const intervalDays = event.recurrence_rule === 'biweekly' ? 14 : 7;
        const targetDay = event.day_of_week ?? 0; // Default Sunday
        const currentDay = dateOnlyStart.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;

        targetDate = new Date(dateOnlyStart);
        targetDate.setDate(dateOnlyStart.getDate() + daysUntilTarget + (i * intervalDays));
      } else if (event.recurrence_rule === 'monthly') {
        targetDate = new Date(
          dateOnlyStart.getFullYear(),
          dateOnlyStart.getMonth() + i,
          dateOnlyStart.getDate()
        );
      } else if (event.recurrence_rule === 'yearly') {
        targetDate = new Date(
          dateOnlyStart.getFullYear() + i,
          dateOnlyStart.getMonth(),
          dateOnlyStart.getDate()
        );
      } else {
        continue;
      }

      const dateStr = formatDateYmd(targetDate);
      const instance = await this.createInstance(eventId, dateStr);
      if (instance) created.push(instance);
    }

    return created;
  },
};

export default EventsModel;
