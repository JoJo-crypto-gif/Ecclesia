-- Add MFA fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_code_expires_at TIMESTAMPTZ;

-- Add global MFA settings
INSERT INTO settings (key, value)
VALUES 
    ('mfa_mode', 'optional'),
    ('mfa_enforced_roles', '[]')
ON CONFLICT (key) DO NOTHING;
