-- Add children JSONB column to members table
ALTER TABLE members
ADD COLUMN children JSONB DEFAULT '[]'::jsonb;
