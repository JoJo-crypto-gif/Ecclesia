CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial templates
INSERT INTO settings (key, value)
VALUES 
    ('birthday_sms_template', 'Hi [FirstName], Happy Birthday and God bless you!'),
    ('absentee_sms_template', 'Hello [FirstName], we missed you at service. See you next time!')
ON CONFLICT (key) DO NOTHING;
