-- Add baptism details columns to members table
ALTER TABLE members
ADD COLUMN is_baptized BOOLEAN DEFAULT false,
ADD COLUMN baptism_date DATE,
ADD COLUMN baptized_by VARCHAR(100),
ADD COLUMN baptism_method VARCHAR(50),
ADD COLUMN baptism_church VARCHAR(150);
