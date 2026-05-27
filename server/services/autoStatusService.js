import { query } from '../config/db.js';
import SettingsModel from '../models/settingsModel.js';

const parseBoolean = (value, defaultValue = false) => {
  if (value === null || value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
};

/**
 * Automated member status management.
 *
 * - checkAutoInactive(): marks Active members as Inactive when they miss
 *   N consecutive completed global Service events.
 * - reactivateMember(): flips an Inactive member back to Active on check-in.
 */
const AutoStatusService = {
  /**
   * Check all Active members against the last N completed global Service
   * instances. Anyone absent from ALL of them gets set to Inactive.
   *
   * Should be called after a global Service instance is marked 'completed'.
   */
  async checkAutoInactive() {
    try {
      // 1. Read settings
      const enabledRaw = await SettingsModel.getSetting('auto_inactive_enabled');
      if (!parseBoolean(enabledRaw, true)) {
        return { skipped: true, reason: 'disabled' };
      }

      const thresholdRaw = await SettingsModel.getSetting('auto_inactive_threshold');
      const threshold = Math.max(1, parseInt(thresholdRaw || '3', 10));

      // 2. Count completed global Service instances
      const countResult = await query(`
        SELECT COUNT(*)::int AS total
        FROM event_instances ei
        JOIN events e ON e.id = ei.event_id
        WHERE ei.status = 'completed'
          AND e.zone_id IS NULL
          AND LOWER(COALESCE(NULLIF(ei.type_override, ''), e.type)) = 'service'
      `);

      if (countResult.rows[0].total < threshold) {
        console.log(`[AutoStatus] Only ${countResult.rows[0].total} completed global services exist (threshold=${threshold}). Skipping.`);
        return { skipped: true, reason: 'insufficient_data' };
      }

      // 3. Find Active members absent from ALL of the last N global services
      const absentResult = await query(`
        WITH recent_services AS (
          SELECT ei.id
          FROM event_instances ei
          JOIN events e ON e.id = ei.event_id
          WHERE ei.status = 'completed'
            AND e.zone_id IS NULL
            AND LOWER(COALESCE(NULLIF(ei.type_override, ''), e.type)) = 'service'
          ORDER BY ei.date DESC
          LIMIT $1
        ),
        members_who_attended AS (
          SELECT DISTINCT a.member_id
          FROM attendance a
          WHERE a.instance_id IN (SELECT id FROM recent_services)
            AND a.member_id IS NOT NULL
        )
        SELECT m.id, m.first_name, m.last_name
        FROM members m
        WHERE m.status = 'Active'
          AND m.id NOT IN (SELECT member_id FROM members_who_attended)
      `, [threshold]);

      const absentMembers = absentResult.rows;
      if (absentMembers.length === 0) {
        console.log('[AutoStatus] No members to auto-deactivate.');
        return { deactivated: 0 };
      }

      // 4. Bulk update to Inactive
      const memberIds = absentMembers.map(m => m.id);
      await query(`
        UPDATE members
        SET status = 'Inactive', updated_at = NOW()
        WHERE id = ANY($1::uuid[])
      `, [memberIds]);

      // 5. Insert audit logs for each deactivated member
      for (const member of absentMembers) {
        await query(`
          INSERT INTO audit_logs (action, module, record_id, record_name, description, changes, actor_name, actor_role)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          'UPDATE',
          'members',
          member.id,
          `${member.first_name} ${member.last_name}`,
          `Auto-deactivated: absent from ${threshold} consecutive global services`,
          JSON.stringify({ status: { from: 'Active', to: 'Inactive' } }),
          'System',
          'system'
        ]);
      }
      console.log(`[AutoStatus] Auto-deactivated ${absentMembers.length} member(s).`);
      return { deactivated: absentMembers.length, members: absentMembers };
    } catch (error) {
      console.error('[AutoStatus] Error in checkAutoInactive:', error);
      return { error: error.message };
    }
  },

  /**
   * Reactivate a member from Inactive → Active.
   * Called when an Inactive member checks in to any event.
   *
   * @param {string} memberId - UUID of the member
   * @param {object} [context] - Optional context for audit logging
   * @param {string} [context.eventName] - Name of the event they checked into
   */
  async reactivateMember(memberId, context = {}) {
    try {
      const enabledRaw = await SettingsModel.getSetting('auto_inactive_enabled');
      if (!parseBoolean(enabledRaw, true)) {
        return { skipped: true, reason: 'disabled' };
      }

      // Update member status
      const result = await query(`
        UPDATE members
        SET status = 'Active', updated_at = NOW()
        WHERE id = $1 AND status = 'Inactive'
        RETURNING id, first_name, last_name
      `, [memberId]);

      const member = result.rows[0];
      if (!member) {
        return { skipped: true, reason: 'not_inactive' };
      }

      // Insert audit log
      const eventInfo = context.eventName ? ` to ${context.eventName}` : '';
      await query(`
        INSERT INTO audit_logs (action, module, record_id, record_name, description, changes, actor_name, actor_role)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'UPDATE',
        'members',
        member.id,
        `${member.first_name} ${member.last_name}`,
        `Auto-reactivated: checked in${eventInfo}`,
        JSON.stringify({ status: { from: 'Inactive', to: 'Active' } }),
        'System',
        'system'
      ]);

      console.log(`[AutoStatus] Auto-reactivated member: ${member.first_name} ${member.last_name}`);
      return { reactivated: true, member };
    } catch (error) {
      console.error('[AutoStatus] Error in reactivateMember:', error);
      return { error: error.message };
    }
  },
};

export default AutoStatusService;
