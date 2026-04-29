-- Migration: Make email column optional in members table
ALTER TABLE members ALTER COLUMN email DROP NOT NULL;
