import MembersModel from '../models/membersModel.js';
import MessagesModel from '../models/messagesModel.js';
import { sendSms } from '../services/messagingService.js';

export const sendManualMessage = async (req, res) => {
  try {
    const { message, channel, audienceType, filters, memberId, memberIds, recipientLabel: customRecipientLabel } = req.body;
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

    if (channel !== 'sms') {
      await MessagesModel.create({
        content: message,
        channel,
        recipientType: normalizedRecipientType,
        recipientTarget: normalizedRecipientTarget,
        recipientLabel,
        recipientCount: recipientMembers.length,
        status: 'sent',
        type: 'manual',
        senderUserId: sessionUser?.id || null,
        senderRole: sessionUser?.role || null,
        senderZoneId: sessionUser?.zoneId || null,
      });
      return res.json({ success: true, count: recipientMembers.length, mocked: true });
    }

    const phoneNumbers = [...new Set(recipientMembers.map((m) => m.phone).filter(Boolean))];
    if (phoneNumbers.length === 0) {
      return res.status(400).json({ success: false, error: { message: "No valid phone numbers found for the selected recipients." } });
    }

    const result = await sendSms(message, phoneNumbers);
    if (!result.success) {
      throw new Error(result.error?.message || result.error || 'Failed to send SMS');
    }

    // Persist to database
    await MessagesModel.create({
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
