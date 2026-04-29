CREATE TABLE IF NOT EXISTS members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  phone           VARCHAR(20),
  address         TEXT,
  status          VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Visitor')),
  zone_id         VARCHAR(50),
  join_date       DATE DEFAULT CURRENT_DATE,
  avatar_url      TEXT,
  notes           TEXT,
  dob             DATE,
  gender          VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other') OR gender IS NULL),
  role            VARCHAR(50),
  occupation      VARCHAR(100),
  emergency_contact VARCHAR(100),
  emergency_phone   VARCHAR(20),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_zone ON members(zone_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(last_name, first_name);
