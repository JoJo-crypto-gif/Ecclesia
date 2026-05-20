-- Migration: Add baptism anniversary SMS settings
INSERT INTO settings (key, value) VALUES
  ('baptism_anniversary_sms_template', 'Hi [FirstName], happy baptism anniversary! Celebrating [YearsSinceBaptism] years since your dedication to Christ. God bless you!')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES
  ('baptism_anniversary_sms_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
