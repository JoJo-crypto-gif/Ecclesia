CREATE TABLE IF NOT EXISTS automated_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type VARCHAR(50) NOT NULL,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_instance_id UUID REFERENCES event_instances(id) ON DELETE SET NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel VARCHAR(10) NOT NULL DEFAULT 'sms',
  provider VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  message_content TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (automation_type, member_id, run_date)
);

CREATE INDEX IF NOT EXISTS idx_automated_message_log_type_date
  ON automated_message_log (automation_type, run_date);

CREATE INDEX IF NOT EXISTS idx_automated_message_log_member
  ON automated_message_log (member_id);

CREATE INDEX IF NOT EXISTS idx_automated_message_log_event_instance
  ON automated_message_log (event_instance_id);
