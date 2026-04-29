-- ═══════════════════════════════════════════════════════════
-- Migration 003: Events + Instances + Attendance
-- ═══════════════════════════════════════════════════════════

-- ─── Event Templates ─────────────────────────────────────
-- Defines WHAT an event is (e.g. "Sunday Service", "Bible Study")
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  type            VARCHAR(50) DEFAULT 'Service'
                    CHECK (type IN ('Service', 'Meeting', 'Special', 'Workshop', 'Prayer', 'Youth')),
  location        VARCHAR(255),
  start_time      TIME,
  is_recurring    BOOLEAN DEFAULT false,
  recurrence_rule VARCHAR(20)
                    CHECK (recurrence_rule IN ('weekly', 'biweekly', 'monthly', 'yearly') OR recurrence_rule IS NULL),
  day_of_week     SMALLINT CHECK (day_of_week BETWEEN 0 AND 6 OR day_of_week IS NULL),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Event Instances (Occurrences) ───────────────────────
-- Each row = one specific date when this event takes place
CREATE TABLE IF NOT EXISTS event_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  status          VARCHAR(20) DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, date)
);

-- ─── Attendance Records ──────────────────────────────────
-- Each row = one person checked in to a specific instance
CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID NOT NULL REFERENCES event_instances(id) ON DELETE CASCADE,
  member_id       UUID REFERENCES members(id) ON DELETE SET NULL,
  visitor_name    VARCHAR(200),
  checked_in_at   TIMESTAMPTZ DEFAULT NOW(),
  status          VARCHAR(20) DEFAULT 'Present'
                    CHECK (status IN ('Present', 'Excused', 'Absent')),
  UNIQUE(instance_id, member_id)
);

-- ─── Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_instances_event ON event_instances(event_id);
CREATE INDEX IF NOT EXISTS idx_instances_date ON event_instances(date);
CREATE INDEX IF NOT EXISTS idx_instances_status ON event_instances(status);
CREATE INDEX IF NOT EXISTS idx_attendance_instance ON attendance(instance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
