-- Migration: Add education to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS education VARCHAR(255);
