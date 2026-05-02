-- Add parent details columns to members table
ALTER TABLE members
ADD COLUMN mother_name VARCHAR(100),
ADD COLUMN mother_status VARCHAR(20),
ADD COLUMN father_name VARCHAR(100),
ADD COLUMN father_status VARCHAR(20);
