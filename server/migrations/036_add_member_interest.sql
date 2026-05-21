-- Migration: Add interest to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS interest VARCHAR(255);
