import { query } from '../config/db.js';

const isMissingSenderColumnsError = (err) => err && err.code === '42703';

const MessagesModel = {
  /**
   * Save a sent message to the database
   */
  async create({
    content,
    channel = 'sms',
    recipientType,
    recipientTarget,
    recipientLabel,
    recipientCount,
    status = 'sent',
    type = 'manual',
    senderUserId = null,
    senderRole = null,
    senderZoneId = null,
    subject = null,
    attachments = null,
  }) {
    // attachments should be stored as JSONB (array of { filename, contentType, size })
    const attachmentsMeta = attachments && attachments.length > 0
      ? JSON.stringify(attachments.map(a => ({ filename: a.filename, contentType: a.contentType, size: a.size })))
      : null;

    try {
      const result = await query(
        `INSERT INTO messages (
           content, channel, recipient_type, recipient_target, recipient_label, recipient_count, status, type,
           sender_user_id, sender_role, sender_zone_id, subject, attachments
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          content,
          channel,
          recipientType,
          recipientTarget || null,
          recipientLabel || null,
          recipientCount || 0,
          status,
          type,
          senderUserId,
          senderRole,
          senderZoneId,
          subject || null,
          attachmentsMeta
        ]
      );
      return result.rows[0];
    } catch (err) {
      if (!isMissingSenderColumnsError(err)) throw err;

      const legacyResult = await query(
        `INSERT INTO messages (
           content, channel, recipient_type, recipient_target, recipient_label, recipient_count, status, type
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          content,
          channel,
          recipientType,
          recipientTarget || null,
          recipientLabel || null,
          recipientCount || 0,
          status,
          type
        ]
      );
      return legacyResult.rows[0];
    }
  },

  /**
   * Get all messages, most recent first
   */
  async findAll({ limit = 50, offset = 0, senderUserId } = {}) {
    const filters = [];
    const params = [];

    if (senderUserId) {
      params.push(senderUserId);
      filters.push(`sender_user_id = $${params.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    params.push(limit);
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    try {
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM messages ${whereClause}`,
        params.slice(0, senderUserId ? 1 : 0)
      );

      const result = await query(
        `SELECT * FROM messages
         ${whereClause}
         ORDER BY sent_at DESC
         LIMIT ${limitParam}
         OFFSET ${offsetParam}`,
        params
      );

      return {
        rows: result.rows,
        total: countResult.rows[0]?.total || 0,
      };
    } catch (err) {
      if (!(senderUserId && isMissingSenderColumnsError(err))) throw err;

      // Backward compatibility for older schema: do not leak global history to zone leaders.
      return { rows: [], total: 0 };
    }
  }
};

export default MessagesModel;
