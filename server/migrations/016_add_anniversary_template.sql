INSERT INTO settings (key, value)
VALUES ('anniversary_sms_template', 'Hi [FirstName], happy wedding anniversary! Wishing you many more blessed years together.')
ON CONFLICT (key) DO NOTHING;
