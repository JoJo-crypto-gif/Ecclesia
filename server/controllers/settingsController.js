import SettingsModel from '../models/settingsModel.js';

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
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await SettingsModel.updateSetting(key, value);
    }
    const updatedSettings = await SettingsModel.getAllSettings();
    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
