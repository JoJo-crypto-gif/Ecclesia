-- Migration: Add home_town to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS home_town VARCHAR(255);
