-- ═══════════════════════════════════════════════════════════
-- Migration 024: Dynamic Roles and Permissions
-- ═══════════════════════════════════════════════════════════

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Roles
-- Admin: Full Access
INSERT INTO roles (name, description, permissions, is_system)
VALUES (
  'admin', 
  'System Administrator with full access to all modules.', 
  '{
    "dashboard": {"read": true, "create": true, "edit": true, "delete": true},
    "members": {"read": true, "create": true, "edit": true, "delete": true},
    "attendance": {"read": true, "create": true, "edit": true, "delete": true},
    "events": {"read": true, "create": true, "edit": true, "delete": true},
    "zones": {"read": true, "create": true, "edit": true, "delete": true},
    "reports": {"read": true, "create": true, "edit": true, "delete": true},
    "messaging": {"read": true, "create": true, "edit": true, "delete": true},
    "settings": {"read": true, "create": true, "edit": true, "delete": true}
  }', 
  true
) ON CONFLICT (name) DO NOTHING;

-- Zone Leader: Limited Access
INSERT INTO roles (name, description, permissions, is_system)
VALUES (
  'zone_leader', 
  'Standard leader responsible for a specific zone.', 
  '{
    "dashboard": {"read": true, "create": false, "edit": false, "delete": false},
    "members": {"read": true, "create": true, "edit": true, "delete": false},
    "attendance": {"read": true, "create": true, "edit": true, "delete": false},
    "events": {"read": true, "create": false, "edit": false, "delete": false},
    "zones": {"read": false, "create": false, "edit": false, "delete": false},
    "reports": {"read": true, "create": false, "edit": false, "delete": false},
    "messaging": {"read": true, "create": true, "edit": false, "delete": false},
    "settings": {"read": true, "create": false, "edit": false, "delete": false}
  }', 
  true
) ON CONFLICT (name) DO NOTHING;

-- 3. Update Users Table
-- Add role_id column (nullable initially for migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Link existing users based on their role string
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE role = 'admin';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'zone_leader') WHERE role = 'zone_leader';

-- Create Index
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
