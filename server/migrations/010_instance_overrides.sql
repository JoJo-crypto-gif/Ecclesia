-- Migration 010: Add instance overrides
-- Allow specific occurrence of a recurring event to deviate from the parent template.

ALTER TABLE event_instances
  ADD COLUMN IF NOT EXISTS name_override VARCHAR(200),
  ADD COLUMN IF NOT EXISTS type_override VARCHAR(50);
