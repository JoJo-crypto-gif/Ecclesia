-- Migration 038: Self-service password reset state
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS temporary_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_reset_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_requested_at
  ON users(password_reset_requested_at)
  WHERE password_reset_requested_at IS NOT NULL;
