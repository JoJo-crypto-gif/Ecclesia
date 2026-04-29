ALTER TABLE members
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS marriage_date DATE;

CREATE INDEX IF NOT EXISTS idx_members_marriage_date ON members(marriage_date);
