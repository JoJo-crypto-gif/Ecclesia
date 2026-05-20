-- Migration: Create audit_logs table for administrative trace logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name    VARCHAR(255),
  actor_email   VARCHAR(255),
  actor_role    VARCHAR(50),
  action        VARCHAR(50) NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'MFA_VERIFY'
  module        VARCHAR(50) NOT NULL, -- e.g., 'members', 'zones', 'events', 'users', 'roles', 'settings', 'auth'
  record_id     VARCHAR(255),         -- Target record UUID or unique key as a string
  record_name   VARCHAR(255),         -- Target human-friendly description (e.g. member name, zone name)
  description   TEXT NOT NULL,        -- A concise description of the log
  changes       JSONB DEFAULT '{}',   -- The change delta JSON mapping: { field: { old: val, new: val } }
  ip_address    VARCHAR(45),          -- IPv4/IPv6 address
  user_agent    TEXT,                 -- Client user agent
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
