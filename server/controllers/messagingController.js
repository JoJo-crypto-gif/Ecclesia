import MembersModel from '../models/membersModel.js';
import MessagesModel from '../models/messagesModel.js';
import EmailTemplatesModel from '../models/emailTemplatesModel.js';
import { sendSms } from '../services/messagingService.js';
import EmailService from '../services/emailService.js';
import {
  sendBirthdaySMS,
  sendAbsenteeSMS,
  sendAnniversarySMS,
  sendBaptismAnniversarySMS
} from '../services/cronService.js';
import AuditService from '../services/auditService.js';

export const sendManualMessage = async (req, res) => {
  try {
    const { message, channel, audienceType, filters, memberId, memberIds, recipientLabel: customRecipientLabel, subject, attachments } = req.body;
    const sessionUser = req.session?.user;
    const isIsolated = sessionUser?.role !== 'admin' && sessionUser?.zoneId;
    const zoneId = sessionUser?.zoneId;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Message content is required.' } });
    }

    if (channel !== 'sms' && channel !== 'email') {
      return res.status(400).json({ success: false, error: { message: 'Unsupported channel.' } });
    }

    if (isIsolated && !zoneId) {
      return res.status(403).json({ success: false, error: { message: 'No zone assigned.' } });
    }

    let recipientMembers = [];
    let recipientLabel = customRecipientLabel || 'Recipients';
    let normalizedRecipientType = audienceType;
    let normalizedRecipientTarget = null;

    if (audienceType === 'filter') {
      const queryFilters = { ...filters, limit: 10000 };
      
      // Enforce zone leader permissions
      if (isIsolated) {
        if (filters.zoneId && filters.zoneId !== zoneId) {
           return res.status(403).json({ success: false, error: { message: 'You can only message your own zone.' } });
        }
        queryFilters.zoneId = zoneId;
      }
      
      const { members } = await MembersModel.findAll(queryFilters);
      recipientMembers = members;
      normalizedRecipientTarget = JSON.stringify(filters);
    } else if (audienceType === 'individual') {
      const requestedMemberIds = Array.from(new Set(
        (Array.isArray(memberIds) ? memberIds : [])
          .concat(memberId ? [memberId] : [])
          .filter((id) => typeof id === 'string' && id.trim().length > 0)
      ));

      if (requestedMemberIds.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'At least one member must be selected for individual recipients.' } });
      }

      recipientMembers = [];
      for (const requestedMemberId of requestedMemberIds) {
        const member = await MembersModel.findById(requestedMemberId);
        if (!member) {
          return res.status(404).json({ success: false, error: { message: 'Member not found.' } });
        }
        if (isIsolated && member.zone_id !== zoneId) {
          return res.status(403).json({ success: false, error: { message: 'You can only message members in your own zone.' } });
        }
        recipientMembers.push(member);
      }
      normalizedRecipientTarget = requestedMemberIds.length === 1
        ? requestedMemberIds[0]
        : JSON.stringify(requestedMemberIds);
    } else {
      return res.status(400).json({ success: false, error: { message: 'Invalid audienceType.' } });
    }

    // ─── EMAIL CHANNEL ─────────────────────────────────────
    if (channel === 'email') {
      const emailAddresses = [...new Set(recipientMembers.map((m) => m.email).filter(Boolean))];

      // Send the actual email via Nodemailer (will mock if SMTP not configured)
      const emailResult = await EmailService.sendMail({
        to: emailAddresses,
        subject: subject || '(No Subject)',
        html: message,
        attachments: Array.isArray(attachments) ? attachments : [],
      });

      // Persist to database regardless of mock/real delivery
      const createdMsg = await MessagesModel.create({
        content: message,
        channel: 'email',
        recipientType: normalizedRecipientType,
        recipientTarget: normalizedRecipientTarget,
        recipientLabel,
        recipientCount: emailAddresses.length,
        status: emailResult.success ? 'sent' : 'failed',
        type: 'manual',
        senderUserId: sessionUser?.id || null,
        senderRole: sessionUser?.role || null,
        senderZoneId: sessionUser?.zoneId || null,
        subject: subject || null,
        attachments: Array.isArray(attachments) ? attachments : null,
      });

      AuditService.log({
        req,
        user: sessionUser,
        action: 'SEND',
        module: 'messaging',
        recordId: createdMsg.id,
        recordName: recipientLabel,
        description: `Sent manual email to ${emailAddresses.length} recipients. Subject: "${subject || '(No Subject)'}"`,
        changes: AuditService.computeChanges({}, createdMsg)
      });

      if (!emailResult.success && !emailResult.mocked) {
        return res.status(500).json({ success: false, error: { message: emailResult.error || 'Failed to send email' } });
      }

      return res.json({ success: true, count: emailAddresses.length, mocked: emailResult.mocked || false });
    }

    // ─── SMS CHANNEL ────────────────────────────────────────
    const phoneNumbers = [...new Set(recipientMembers.map((m) => m.phone).filter(Boolean))];
    if (phoneNumbers.length === 0) {
      return res.status(400).json({ success: false, error: { message: "No valid phone numbers found for the selected recipients." } });
    }

    const result = await sendSms(message, phoneNumbers);
    if (!result.success) {
      throw new Error(result.error?.message || result.error || 'Failed to send SMS');
    }

    // Persist to database
    const createdMsg = await MessagesModel.create({
      content: message,
      channel: 'sms',
      recipientType: normalizedRecipientType,
      recipientTarget: normalizedRecipientTarget,
      recipientLabel,
      recipientCount: phoneNumbers.length,
      status: 'sent',
      type: 'manual',
      senderUserId: sessionUser?.id || null,
      senderRole: sessionUser?.role || null,
      senderZoneId: sessionUser?.zoneId || null,
    });

    AuditService.log({
      req,
      user: sessionUser,
      action: 'SEND',
      module: 'messaging',
      recordId: createdMsg.id,
      recordName: recipientLabel,
      description: `Sent manual SMS to ${phoneNumbers.length} recipients`,
      changes: AuditService.computeChanges({}, createdMsg)
    });

    res.json({ success: true, count: phoneNumbers.length });
  } catch (err) {
    console.error('sendManualMessage Error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const getMessageHistory = async (req, res) => {
  try {
    const sessionUser = req.session?.user;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * limit;
    const senderUserId = (sessionUser?.role !== 'admin' && sessionUser?.zoneId) ? sessionUser.id : undefined;

    const result = await MessagesModel.findAll({ limit, offset, senderUserId });
    const totalPages = Math.max(1, Math.ceil(result.total / limit));

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.total,
        limit,
        page,
        totalPages,
      },
    });
  } catch (err) {
    console.error('getMessageHistory Error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Email Template CRUD ────────────────────────────────

export const getEmailTemplates = async (_req, res) => {
  try {
    const templates = await EmailTemplatesModel.findAll();
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error('getEmailTemplates Error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const getEmailTemplateById = async (req, res) => {
  try {
    const template = await EmailTemplatesModel.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: { message: 'Template not found' } });
    }
    res.json({ success: true, data: template });
  } catch (err) {
    console.error('getEmailTemplateById Error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const createEmailTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    const sessionUser = req.session?.user;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Template name is required.' } });
    }
    const template = await EmailTemplatesModel.create({ name: name.trim(), subject, body });
    AuditService.log({
      req,
      user: sessionUser,
      action: 'CREATE',
      module: 'messaging',
      recordId: template.id,
      recordName: template.name,
      description: `Created email template: "${template.name}"`,
      changes: AuditService.computeChanges({}, template)
    });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    console.error('createEmailTemplate Error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const updateEmailTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    const sessionUser = req.session?.user;
    const existing = await EmailTemplatesModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Template not found' } });
    }
    const template = await EmailTemplatesModel.update(req.params.id, { name, subject, body });
    if (!template) {
      return res.status(404).json({ success: false, error: { message: 'Template not found' } });
    }
    const changes = AuditService.computeChanges(existing, template);
    if (Object.keys(changes).length > 0) {
      AuditService.log({
        req,
        user: sessionUser,
        action: 'UPDATE',
        module: 'messaging',
        recordId: template.id,
        recordName: template.name,
        description: `Updated email template: "${template.name}"`,
        changes
      });
    }
    res.json({ success: true, data: template });
  } catch (err) {
    console.error('updateEmailTemplate Error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const deleteEmailTemplate = async (req, res) => {
  try {
    const sessionUser = req.session?.user;
    const existing = await EmailTemplatesModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Template not found' } });
    }
    const deleted = await EmailTemplatesModel.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Template not found' } });
    }
    AuditService.log({
      req,
      user: sessionUser,
      action: 'DELETE',
      module: 'messaging',
      recordId: existing.id,
      recordName: existing.name,
      description: `Deleted email template: "${existing.name}"`,
      changes: AuditService.computeChanges(existing, {})
    });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteEmailTemplate Error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const triggerAutomationJob = async (req, res) => {
  try {
    const { type } = req.body;
    const sessionUser = req.session?.user;
    const validTypes = ['birthday', 'absentee', 'anniversary', 'baptism_anniversary'];
    
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: { message: `Invalid automation type. Must be one of: ${validTypes.join(', ')}` } 
      });
    }

    console.log(`[Manual Trigger] User triggered automated job: ${type}`);
    
    if (type === 'birthday') {
      await sendBirthdaySMS();
    } else if (type === 'absentee') {
      await sendAbsenteeSMS();
    } else if (type === 'anniversary') {
      await sendAnniversarySMS();
    } else if (type === 'baptism_anniversary') {
      await sendBaptismAnniversarySMS();
    }

    AuditService.log({
      req,
      user: sessionUser,
      action: 'TRIGGER',
      module: 'messaging',
      recordId: `automation_${type}`,
      recordName: `${type} automation`,
      description: `Manually triggered automated SMS job: ${type}`,
    });

    res.json({ success: true, message: `Successfully triggered ${type} automated job.` });
  } catch (err) {
    console.error(`[Manual Trigger] Error triggering job ${type}:`, err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
