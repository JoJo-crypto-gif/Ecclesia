-- ─── Email Templates Table ───────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates (name);

-- ─── Add subject + attachments columns to messages ──────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attachments JSONB;

-- ─── Seed beautiful starter templates ────────────────────

INSERT INTO email_templates (name, subject, body) VALUES
(
  'Weekly Bulletin',
  'This Week at Ecclesia — [Date]',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">⛪ Ecclesia Weekly Bulletin</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your weekly update from the church family</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.7;">Dear [FirstName],</p>
        <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">We hope this message finds you well. Here are the highlights for this week:</p>

        <!-- Section: Upcoming Events -->
        <div style="margin-bottom:28px;padding:20px;background:#f8fafc;border-radius:12px;border-left:4px solid #4f46e5;">
          <h2 style="margin:0 0 12px;color:#1e293b;font-size:18px;">📅 Upcoming Events</h2>
          <p style="margin:0;color:#64748b;font-size:14px;line-height:1.8;">• <strong>Sunday Service</strong> — 9:00 AM<br>• <strong>Bible Study</strong> — Wednesday 6:30 PM<br>• <strong>Youth Fellowship</strong> — Friday 5:00 PM</p>
        </div>

        <!-- Section: Announcements -->
        <div style="margin-bottom:28px;padding:20px;background:#fefce8;border-radius:12px;border-left:4px solid #eab308;">
          <h2 style="margin:0 0 12px;color:#1e293b;font-size:18px;">📢 Announcements</h2>
          <p style="margin:0;color:#64748b;font-size:14px;line-height:1.8;">Type your announcements here. Keep the congregation informed about important updates.</p>
        </div>

        <!-- Section: Prayer Requests -->
        <div style="margin-bottom:28px;padding:20px;background:#f0fdf4;border-radius:12px;border-left:4px solid #22c55e;">
          <h2 style="margin:0 0 12px;color:#1e293b;font-size:18px;">🙏 Prayer Requests</h2>
          <p style="margin:0;color:#64748b;font-size:14px;line-height:1.8;">Remember our members in your prayers this week.</p>
        </div>

        <p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.7;">God bless you and your family.<br><strong>— The Ecclesia Team</strong></p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">Ecclesia Church Management System</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>'
),
(
  'Event Invitation',
  'You''re Invited! — [EventName]',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Hero -->
    <tr>
      <td style="background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);padding:48px 40px;text-align:center;">
        <p style="margin:0 0 8px;font-size:48px;">🎉</p>
        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">You''re Invited!</h1>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">A special event is coming up</p>
      </td>
    </tr>
    <!-- Details Card -->
    <tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 20px;color:#334155;font-size:16px;line-height:1.7;">Dear [FirstName],</p>
        <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">We are excited to invite you to a special event. Please mark your calendar!</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <strong style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Event</strong><br>
              <span style="color:#1e293b;font-size:16px;font-weight:600;">[Event Name]</span>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
              <strong style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Date & Time</strong><br>
              <span style="color:#1e293b;font-size:15px;">[Date] at [Time]</span>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px;">
              <strong style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Location</strong><br>
              <span style="color:#1e293b;font-size:15px;">[Venue/Location]</span>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">We would love to see you there. Feel free to bring a friend!</p>
        <p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">Blessings,<br><strong>— The Ecclesia Team</strong></p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">Ecclesia Church Management System</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>'
),
(
  'Church Announcement',
  'Important Announcement from Ecclesia',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#f97316 0%,#ef4444 100%);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">📢 Church Announcement</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.7;">Dear [FirstName],</p>
        <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">We have an important announcement to share with the congregation:</p>

        <div style="margin-bottom:24px;padding:24px;background:linear-gradient(135deg,#fef3c7,#fff7ed);border-radius:12px;border:1px solid #fde68a;">
          <p style="margin:0;color:#92400e;font-size:15px;line-height:1.8;font-weight:500;">
            [Type your announcement here. Replace this placeholder with the actual message you want to communicate to the church.]
          </p>
        </div>

        <p style="margin:0 0 8px;color:#475569;font-size:15px;line-height:1.7;">If you have any questions, please don''t hesitate to reach out to the church office.</p>
        <p style="margin:16px 0 0;color:#475569;font-size:15px;line-height:1.7;">God bless,<br><strong>— Church Leadership</strong></p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">Ecclesia Church Management System</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>'
)
ON CONFLICT DO NOTHING;
