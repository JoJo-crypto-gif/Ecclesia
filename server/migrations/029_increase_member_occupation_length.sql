-- Increase member occupation column character limit to accommodate JSON-serialized structured data
ALTER TABLE members ALTER COLUMN occupation TYPE VARCHAR(500);
