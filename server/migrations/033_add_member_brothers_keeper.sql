-- Migration: Add brothers_keeper to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS brothers_keeper VARCHAR(255);
