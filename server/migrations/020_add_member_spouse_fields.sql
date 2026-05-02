-- Add spouse details columns to members table
ALTER TABLE members
ADD COLUMN spouse_name VARCHAR(100),
ADD COLUMN spouse_phone VARCHAR(20);
