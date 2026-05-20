import SettingsModel from '../models/settingsModel.js';
import AuditService from '../services/auditService.js';

export const getSettings = async (req, res) => {
  try {
    const settings = await SettingsModel.getAllSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const sessionUser = req.session?.user;
    const oldSettings = await SettingsModel.getAllSettings();

    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await SettingsModel.updateSetting(key, value);
    }
    const updatedSettings = await SettingsModel.getAllSettings();

    const changes = AuditService.computeChanges(oldSettings, updatedSettings);
    if (Object.keys(changes).length > 0) {
      AuditService.log({
        req,
        user: sessionUser,
        action: 'UPDATE',
        module: 'settings',
        recordId: 'system_settings',
        recordName: 'System Configuration',
        description: 'Updated system settings configurations',
        changes
      });
    }

    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
