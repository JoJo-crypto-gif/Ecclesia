ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_role VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sender_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_user_id ON messages (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_zone_id ON messages (sender_zone_id);
