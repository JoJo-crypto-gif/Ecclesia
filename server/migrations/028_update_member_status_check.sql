-- Migration: Update members_status_check to include 'Ex-member'
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;
ALTER TABLE members ADD CONSTRAINT members_status_check CHECK (status IN ('Active', 'Inactive', 'Visitor', 'Ex-member'));
