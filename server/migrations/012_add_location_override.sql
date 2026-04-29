-- Migration 012: Add location override to specific occurrences
ALTER TABLE event_instances
  ADD COLUMN IF NOT EXISTS location_override VARCHAR(255);
