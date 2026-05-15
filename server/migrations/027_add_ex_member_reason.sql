-- Migration: Add ex_member_reason to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS ex_member_reason TEXT;
