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

const sendAbsenteeSMS = async () => {
  if (!(await isAutomationEnabled('absentee_sms_enabled', 'ENABLE_ABSENTEE_SMS'))) return;
  console.log('[Cron] Running Absentee SMS check for today...');

  try {
    const configuredTemplate = await SettingsModel.getSetting('absentee_sms_template');
    if (!configuredTemplate) {
      console.log('[Cron] No absentee sms template found. Skipping.');
      return;
    }
    const template = ensureEventNameInTemplate(configuredTemplate);

    // Find today's non-cancelled service instances only.
    const instancesResult = await query(`
      SELECT
        ei.id,
        ei.event_id,
        ei.date,
        e.zone_id,
        COALESCE(NULLIF(ei.name_override, ''), e.name) AS event_name,
        COALESCE(NULLIF(ei.type_override, ''), e.type) AS event_type
      FROM event_instances ei
      JOIN events e ON e.id = ei.event_id
      WHERE ei.date = CURRENT_DATE
        AND ei.status <> 'cancelled'
        AND LOWER(COALESCE(NULLIF(ei.type_override, ''), e.type)) = 'service'
    `);

    if (instancesResult.rows.length === 0) {
      console.log('[Cron] No service instances recorded for today. Skipping absentee SMS.');
      return;
    }

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
        console.log(`[Cron] Found ${absentees.length} absentees for ${instance.event_name}. Dispatching SMS...`);
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

const sendBaptismAnniversarySMS = async () => {
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

  // Baptism Anniversary Job: Run every day at 08:20 AM
  cron.schedule('20 8 * * *', () => {
    sendBaptismAnniversarySMS();
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
