CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    channel VARCHAR(10) NOT NULL DEFAULT 'sms',
    recipient_type VARCHAR(20) NOT NULL,
    recipient_target VARCHAR(255),
    recipient_label VARCHAR(255),
    recipient_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    type VARCHAR(20) NOT NULL DEFAULT 'manual',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages (type);
