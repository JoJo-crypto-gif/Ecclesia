import { query } from '../config/db.js';

const EmailTemplatesModel = {
  /**
   * List all email templates, newest first
   */
  async findAll() {
    const result = await query(
      'SELECT * FROM email_templates ORDER BY created_at DESC'
    );
    return result.rows;
  },

  /**
   * Get a single template by ID
   */
  async findById(id) {
    const result = await query(
      'SELECT * FROM email_templates WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new template
   */
  async create({ name, subject, body }) {
    const result = await query(
      `INSERT INTO email_templates (name, subject, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, subject || '', body || '']
    );
    return result.rows[0];
  },

  /**
   * Update an existing template
   */
  async update(id, { name, subject, body }) {
    const result = await query(
      `UPDATE email_templates
       SET name = COALESCE($2, name),
           subject = COALESCE($3, subject),
           body = COALESCE($4, body),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, subject, body]
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a template
   */
  async deleteById(id) {
    const result = await query(
      'DELETE FROM email_templates WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }
};

export default EmailTemplatesModel;
