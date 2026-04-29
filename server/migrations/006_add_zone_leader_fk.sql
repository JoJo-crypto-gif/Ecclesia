-- Migration: add leader_id FK to zones
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES members(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_zones_leader_id ON zones(leader_id);
