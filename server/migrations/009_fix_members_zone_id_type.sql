-- Migration 009: Fix members.zone_id column type from VARCHAR to UUID
-- Problem: members.zone_id was VARCHAR(50) but zones.id is UUID.
-- This caused a PostgreSQL type error: "operator does not exist: character varying = uuid"
-- which silently broke GET /api/zones (member_count subquery) and any cross-table joins.

ALTER TABLE members
  ALTER COLUMN zone_id TYPE UUID USING zone_id::uuid;
