import cron from 'node-cron';
import { query } from '../config/db.js';
import SettingsModel from '../models/settingsModel.js';
import MessagesModel from '../models/messagesModel.js';
import EventsService from './eventsService.js';
import { sendSms } from './messagingService.js';

const parseBoolean = (value, defaultValue = false) => {
  if (value === null || value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const getToggle = async (settingKey, envKey, defaultValue = true) => {
  const fromSettings = await SettingsModel.getSetting(settingKey);
  if (fromSettings !== null) {
    return parseBoolean(fromSettings, defaultValue);
  }
  return parseBoolean(process.env[envKey], defaultValue);
};

const isAutomationEnabled = async (typeSettingKey, typeEnvKey) => {
  const globalEnabled = await getToggle('automated_sms_enabled', 'ENABLE_AUTOMATED_SMS', true);
  if (!globalEnabled) return false;
  return getToggle(typeSettingKey, typeEnvKey, true);
};

/**
 * Replace placeholders like [FirstName] with actual values
 */
const formatMessage = (template, member) => {
  if (!template) return '';
  const getYearsSince = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    let years = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    const dayDiff = now.getDate() - date.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years--;
    }
    return String(Math.max(years, 0));
  };

  let msg = template.replace(/\[FirstName\]/gi, member.first_name || '');
  msg = msg.replace(/\[LastName\]/gi, member.last_name || '');
  msg = msg.replace(/\[YearsMarried\]/gi, getYearsSince(member.marriage_date));
  return msg;
};

const sendBirthdaySMS = async () => {
  if (!(await isAutomationEnabled('birthday_sms_enabled', 'ENABLE_BIRTHDAY_SMS'))) return;
  console.log('[Cron] Running Daily Birthday SMS check...');

  try {
    const template = await SettingsModel.getSetting('birthday_sms_template');
    if (!template) {
      console.log('[Cron] No birthday sms template found. Skipping.');
      return;
    }

    // Find active members with a birthday today
    const result = await query(`
      SELECT id, first_name, last_name, phone 
      FROM members 
      WHERE status = 'Active' 
        AND phone IS NOT NULL 
        AND EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM CURRENT_DATE) 
        AND EXTRACT(DAY FROM dob) = EXTRACT(DAY FROM CURRENT_DATE)
    `);

    const members = result.rows;
    if (members.length === 0) {
      console.log('[Cron] No birthdays today.');
      return;
    }

    console.log(`[Cron] Found ${members.length} birthdays today. Dispatching SMS...`);
    let sentCount = 0;
    for (const member of members) {
      const msg = formatMessage(template, member);
      const result = await sendSms(msg, [member.phone]);
      if (result.success) sentCount++;
    }

    // Save to message history
    if (sentCount > 0) {
      await MessagesModel.create({
        content: template,
        channel: 'sms',
        recipientType: 'birthday',
        recipientLabel: 'Birthday Members',
        recipientCount: sentCount,
        status: 'sent',
        type: 'automated'
      });
    }
    console.log('[Cron] Birthday SMS dispatch complete.');
  } catch (error) {
    console.error('[Cron] Error in sendBirthdaySMS:', error);
  }
};

const sendAbsenteeSMS = async () => {
  if (!(await isAutomationEnabled('absentee_sms_enabled', 'ENABLE_ABSENTEE_SMS'))) return;
  console.log('[Cron] Running Absentee SMS check for today...');

  try {
    const template = await SettingsModel.getSetting('absentee_sms_template');
    if (!template) {
      console.log('[Cron] No absentee sms template found. Skipping.');
      return;
    }

    // 1. Find all event instances that happened today (usually Sunday service)
    const instancesResult = await query(`
      SELECT id, event_id FROM event_instances 
      WHERE date = CURRENT_DATE
    `);

    if (instancesResult.rows.length === 0) {
      console.log('[Cron] No event instances recorded for today. Skipping absentee SMS.');
      return;
    }

    // Usually there's just one main service, but to be safe we pick the first one or loop
    for (const instance of instancesResult.rows) {
      // Find active members who did NOT check in to this instance
      const absenteesResult = await query(`
        SELECT m.id, m.first_name, m.last_name, m.phone 
        FROM members m
        WHERE m.status = 'Active' 
          AND m.phone IS NOT NULL
          AND m.id NOT IN (
            SELECT member_id FROM attendance WHERE instance_id = $1 AND member_id IS NOT NULL
          )
      `, [instance.id]);

      const absentees = absenteesResult.rows;
      if (absentees.length > 0) {
        console.log(`[Cron] Found ${absentees.length} absentees for instance ${instance.id}. Dispatching SMS...`);
        let sentCount = 0;
        for (const member of absentees) {
           const msg = formatMessage(template, member);
           const result = await sendSms(msg, [member.phone]);
           if (result.success) sentCount++;
        }

        // Save to message history
        if (sentCount > 0) {
          await MessagesModel.create({
            content: template,
            channel: 'sms',
            recipientType: 'absentee',
            recipientLabel: 'Absentee Members',
            recipientCount: sentCount,
            status: 'sent',
            type: 'automated'
          });
        }
      }
    }
    console.log('[Cron] Absentee SMS check complete.');
  } catch (error) {
    console.error('[Cron] Error in sendAbsenteeSMS:', error);
  }
};

const sendAnniversarySMS = async () => {
  if (!(await isAutomationEnabled('anniversary_sms_enabled', 'ENABLE_ANNIVERSARY_SMS'))) return;
  console.log('[Cron] Running Daily Wedding Anniversary SMS check...');

  try {
    const template = await SettingsModel.getSetting('anniversary_sms_template');
    if (!template) {
      console.log('[Cron] No anniversary sms template found. Skipping.');
      return;
    }

    const result = await query(`
      SELECT id, first_name, last_name, phone, marriage_date
      FROM members
      WHERE status = 'Active'
        AND marital_status = 'Married'
        AND marriage_date IS NOT NULL
        AND phone IS NOT NULL
        AND EXTRACT(MONTH FROM marriage_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM marriage_date) = EXTRACT(DAY FROM CURRENT_DATE)
    `);

    const members = result.rows;
    if (members.length === 0) {
      console.log('[Cron] No wedding anniversaries today.');
      return;
    }

    console.log(`[Cron] Found ${members.length} wedding anniversaries today. Dispatching SMS...`);
    let sentCount = 0;
    for (const member of members) {
      const msg = formatMessage(template, member);
      const result = await sendSms(msg, [member.phone]);
      if (result.success) sentCount++;
    }

    if (sentCount > 0) {
      await MessagesModel.create({
        content: template,
        channel: 'sms',
        recipientType: 'anniversary',
        recipientLabel: 'Married Members',
        recipientCount: sentCount,
        status: 'sent',
        type: 'automated'
      });
    }

    console.log('[Cron] Wedding Anniversary SMS dispatch complete.');
  } catch (error) {
    console.error('[Cron] Error in sendAnniversarySMS:', error);
  }
};

const syncPastEventInstances = async () => {
  try {
    const updatedCount = await EventsService.syncPastInstances();
    if (updatedCount > 0) {
      console.log(`[Cron] Marked ${updatedCount} past event instance(s) as completed.`);
    }
  } catch (error) {
    console.error('[Cron] Error in syncPastEventInstances:', error);
  }
};

export const initCronJobs = () => {
  console.log('🤖 Initializing Automated SMS Cron Jobs...');
  syncPastEventInstances();
  
  // Birthday Job: Run every day at 08:00 AM
  cron.schedule('0 8 * * *', () => {
    sendBirthdaySMS();
  });

  // Anniversary Job: Run every day at 08:10 AM
  cron.schedule('10 8 * * *', () => {
    sendAnniversarySMS();
  });

  // Absentee Job: Run every Sunday at 14:30 (2:30 PM)
  cron.schedule('30 14 * * 0', () => {
    sendAbsenteeSMS();
  });

  // Instance status sync: run hourly to avoid write-on-read side effects.
  cron.schedule('5 * * * *', () => {
    syncPastEventInstances();
  });
};
