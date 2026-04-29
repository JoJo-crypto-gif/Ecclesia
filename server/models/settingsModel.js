import { query } from '../config/db.js';

const SettingsModel = {
  /**
   * Get all settings as a key-value object
   */
  async getAllSettings() {
    const result = await query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  },

  /**
   * Get a specific setting by key
   */
  async getSetting(key) {
    const result = await query('SELECT value FROM settings WHERE key = $1', [key]);
    return result.rows.length ? result.rows[0].value : null;
  },

  /**
   * Update or create a setting
   */
  async updateSetting(key, value) {
    const result = await query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING *`,
      [key, value]
    );
    return result.rows[0];
  }
};

export default SettingsModel;
