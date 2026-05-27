import cron from 'node-cron';
import { query } from '../config/db.js';
import SettingsModel from '../models/settingsModel.js';
import MessagesModel from '../models/messagesModel.js';
import EventsService from './eventsService.js';
import AutoStatusService from './autoStatusService.js';
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
const formatMessage = (template, member, context = {}) => {
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
  msg = msg.replace(/\[YearsSinceBaptism\]/gi, getYearsSince(member.baptism_date));
  msg = msg.replace(/\[EventName\]/gi, context.eventName || '');
  msg = msg.replace(/\[ServiceName\]/gi, context.eventName || '');
  return msg;
};

const ensureEventNameInTemplate = (template) => {
  if (/\[(EventName|ServiceName)\]/i.test(template)) return template;
  return `${template.trim()} Service: [EventName]`;
};

const stringifySendError = (result) => {
  if (!result) return null;
  if (typeof result.error === 'string') return result.error;
  if (result.error?.message) return result.error.message;
  if (result.success === false) return 'SMS provider rejected the message';
  return null;
};

const claimAutomatedSms = async ({ automationType, memberId, eventInstanceId = null }) => {
  const result = await query(
    `INSERT INTO automated_message_log (
       automation_type, member_id, event_instance_id, channel, status
     )
     VALUES ($1, $2, $3, 'sms', 'pending')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [automationType, memberId, eventInstanceId]
  );

  return result.rows[0] || null;
};

const completeAutomatedSms = async (logId, result, message) => {
  await query(
    `UPDATE automated_message_log
     SET status = $2,
         provider = $3,
         message_content = $4,
         error = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [
      logId,
      result.success ? 'sent' : 'failed',
      result.provider || null,
      message,
      stringifySendError(result)
    ]
  );
};

const sendAutomatedSmsToMembers = async ({
  automationType,
  template,
  members,
  eventInstanceId = null,
  context = {}
}) => {
  let sentCount = 0;
  let skippedCount = 0;

  for (const member of members) {
    const claim = await claimAutomatedSms({
      automationType,
      memberId: member.id,
      eventInstanceId
    });

    if (!claim) {
      skippedCount++;
      continue;
    }

    const msg = formatMessage(template, member, context);
    const result = await sendSms(msg, [member.phone]);
    await completeAutomatedSms(claim.id, result, msg);

    if (result.success) sentCount++;
  }

  if (skippedCount > 0) {
    console.log(`[Cron] Skipped ${skippedCount} duplicate ${automationType} SMS recipient(s).`);
  }

  return sentCount;
};

export const sendBirthdaySMS = async () => {
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
    const sentCount = await sendAutomatedSmsToMembers({
      automationType: 'birthday',
      template,
      members
    });

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

export const sendAbsenteeSMS = async () => {
  if (!(await isAutomationEnabled('absentee_sms_enabled', 'ENABLE_ABSENTEE_SMS'))) return;

  try {
    const configuredTemplate = await SettingsModel.getSetting('absentee_sms_template');
    if (!configuredTemplate) return;
    const template = ensureEventNameInTemplate(configuredTemplate);

    // Read admin-configured delay (default 1 hour)
    const delaySetting = await SettingsModel.getSetting('absentee_sms_delay_hours');
    const delayHours = Math.max(1, parseInt(delaySetting, 10) || 1);

    // Find completed service instances where completed_at is at least delayHours ago
    // and absentee SMS has NOT already been sent for that instance.
    const instancesResult = await query(`
      SELECT
        ei.id,
        ei.event_id,
        ei.date,
        ei.completed_at,
        e.zone_id,
        COALESCE(NULLIF(ei.name_override, ''), e.name) AS event_name,
        COALESCE(NULLIF(ei.type_override, ''), e.type) AS event_type
      FROM event_instances ei
      JOIN events e ON e.id = ei.event_id
      WHERE ei.status = 'completed'
        AND ei.completed_at IS NOT NULL
        AND ei.completed_at <= NOW() - INTERVAL '1 hour' * $1
        AND LOWER(COALESCE(NULLIF(ei.type_override, ''), e.type)) = 'service'
        AND NOT EXISTS (
          SELECT 1 FROM automated_message_log aml
          WHERE aml.event_instance_id = ei.id
            AND aml.automation_type = 'absentee'
            AND aml.status IN ('sent', 'pending')
        )
    `, [delayHours]);

    if (instancesResult.rows.length === 0) return;

    console.log(`[Cron] Found ${instancesResult.rows.length} completed service(s) ready for absentee follow-up.`);

    for (const instance of instancesResult.rows) {
      // Find active members in this service scope who missed this service.
      const absenteesResult = await query(`
        SELECT m.id, m.first_name, m.last_name, m.phone 
        FROM members m
        WHERE m.status = 'Active' 
          AND m.phone IS NOT NULL
          AND ($2::uuid IS NULL OR m.zone_id = $2)
          AND NOT EXISTS (
            SELECT 1
            FROM attendance a
            WHERE a.instance_id = $1
              AND a.member_id = m.id
          )
      `, [instance.id, instance.zone_id]);

      const absentees = absenteesResult.rows;
      if (absentees.length > 0) {
        console.log(`[Cron] Found ${absentees.length} absentees for ${instance.event_name} (${instance.date}). Dispatching SMS...`);
        const sentCount = await sendAutomatedSmsToMembers({
          automationType: 'absentee',
          template,
          members: absentees,
          eventInstanceId: instance.id,
          context: { eventName: instance.event_name }
        });

        // Save to message history
        if (sentCount > 0) {
          await MessagesModel.create({
            content: template,
            channel: 'sms',
            recipientType: 'absentee',
            recipientTarget: instance.id,
            recipientLabel: `${instance.event_name} Absentees`,
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

export const sendAnniversarySMS = async () => {
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
    const sentCount = await sendAutomatedSmsToMembers({
      automationType: 'anniversary',
      template,
      members
    });

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

export const sendBaptismAnniversarySMS = async () => {
  if (!(await isAutomationEnabled('baptism_anniversary_sms_enabled', 'ENABLE_BAPTISM_ANNIVERSARY_SMS'))) return;
  console.log('[Cron] Running Daily Baptism Anniversary SMS check...');

  try {
    const template = await SettingsModel.getSetting('baptism_anniversary_sms_template');
    if (!template) {
      console.log('[Cron] No baptism anniversary sms template found. Skipping.');
      return;
    }

    const result = await query(`
      SELECT id, first_name, last_name, phone, baptism_date
      FROM members
      WHERE status = 'Active'
        AND is_baptized = true
        AND baptism_date IS NOT NULL
        AND phone IS NOT NULL
        AND EXTRACT(MONTH FROM baptism_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM baptism_date) = EXTRACT(DAY FROM CURRENT_DATE)
    `);

    const members = result.rows;
    if (members.length === 0) {
      console.log('[Cron] No baptism anniversaries today.');
      return;
    }

    console.log(`[Cron] Found ${members.length} baptism anniversaries today. Dispatching SMS...`);
    const sentCount = await sendAutomatedSmsToMembers({
      automationType: 'baptism_anniversary',
      template,
      members
    });

    if (sentCount > 0) {
      await MessagesModel.create({
        content: template,
        channel: 'sms',
        recipientType: 'baptism_anniversary',
        recipientLabel: 'Baptized Members',
        recipientCount: sentCount,
        status: 'sent',
        type: 'automated'
      });
    }

    console.log('[Cron] Baptism Anniversary SMS dispatch complete.');
  } catch (error) {
    console.error('[Cron] Error in sendBaptismAnniversarySMS:', error);
  }
};

const syncPastEventInstances = async () => {
  try {
    const updatedCount = await EventsService.syncPastInstances();
    if (updatedCount > 0) {
      console.log(`[Cron] Marked ${updatedCount} past event instance(s) as completed.`);
      // After completing instances, check if any members should be auto-deactivated
      await AutoStatusService.checkAutoInactive();
    }
  } catch (error) {
    console.error('[Cron] Error in syncPastEventInstances:', error);
  }
};

// ─── Configurable Time-Based Runner ─────────────────────────
// Instead of hardcoded cron schedules, a minutely runner reads
// admin-configured times from settings and fires jobs when matched.
const dateJobLastRun = new Map();

const getConfiguredTime = async (settingKey, defaultTime) => {
  const val = await SettingsModel.getSetting(settingKey);
  if (val && /^\d{2}:\d{2}$/.test(val)) return val;
  return defaultTime;
};

const getCurrentHHMM = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const getTodayDateStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const runDateBasedJobs = async () => {
  const currentTime = getCurrentHHMM();
  const today = getTodayDateStr();

  const jobs = [
    { key: 'birthday', settingKey: 'birthday_sms_time', defaultTime: '08:00', fn: sendBirthdaySMS },
    { key: 'anniversary', settingKey: 'anniversary_sms_time', defaultTime: '08:00', fn: sendAnniversarySMS },
    { key: 'baptism_anniversary', settingKey: 'baptism_anniversary_sms_time', defaultTime: '08:00', fn: sendBaptismAnniversarySMS },
  ];

  for (const job of jobs) {
    try {
      const configuredTime = await getConfiguredTime(job.settingKey, job.defaultTime);
      const lastRun = dateJobLastRun.get(job.key);

      if (currentTime === configuredTime && lastRun !== today) {
        console.log(`[Cron] Time match for ${job.key} (${configuredTime}). Running...`);
        dateJobLastRun.set(job.key, today);
        await job.fn();
      }
    } catch (error) {
      console.error(`[Cron] Error checking ${job.key} schedule:`, error);
    }
  }
};

export const initCronJobs = () => {
  console.log('🤖 Initializing Automated SMS Cron Jobs...');
  syncPastEventInstances();
  
  // Minutely runner: checks admin-configured send times for date-based jobs
  cron.schedule('* * * * *', () => {
    runDateBasedJobs();
  });

  // Absentee runner: checks every 5 minutes for completed services past delay threshold
  cron.schedule('*/5 * * * *', () => {
    sendAbsenteeSMS();
  });

  // Instance status sync: run hourly to avoid write-on-read side effects.
  cron.schedule('5 * * * *', () => {
    syncPastEventInstances();
  });
};
