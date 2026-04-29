INSERT INTO settings (key, value)
VALUES
  ('automated_sms_enabled', 'true'),
  ('birthday_sms_enabled', 'true'),
  ('anniversary_sms_enabled', 'true'),
  ('absentee_sms_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
