-- ═══════════════════════════════════════════════════════════
-- Migration 043: Add completed_at timestamp to event_instances
-- Tracks WHEN an instance was marked completed so absentee
-- SMS can fire X hours after completion (event-driven).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE event_instances
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill existing completed instances with created_at as approximation
UPDATE event_instances
  SET completed_at = created_at
  WHERE status = 'completed' AND completed_at IS NULL;

-- Index for efficient querying by the absentee runner
CREATE INDEX IF NOT EXISTS idx_instances_completed_at
  ON event_instances (status, completed_at)
  WHERE status = 'completed' AND completed_at IS NOT NULL;
