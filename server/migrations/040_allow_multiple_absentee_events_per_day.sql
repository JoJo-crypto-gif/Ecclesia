ALTER TABLE automated_message_log
  DROP CONSTRAINT IF EXISTS automated_message_log_automation_type_member_id_run_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_automated_message_log_daily_recipient
  ON automated_message_log (automation_type, member_id, run_date)
  WHERE event_instance_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_automated_message_log_event_recipient
  ON automated_message_log (automation_type, member_id, run_date, event_instance_id)
  WHERE event_instance_id IS NOT NULL;

UPDATE settings
SET value = 'Hello [FirstName], we missed you at [EventName]. See you next time!'
WHERE key = 'absentee_sms_template'
  AND value = 'Hello [FirstName], we missed you at service. See you next time!';
