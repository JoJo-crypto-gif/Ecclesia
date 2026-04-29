-- Migration: add zone_id to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_zone_id ON events(zone_id);
