import MembersModel from '../models/membersModel.js';
import MessagesModel from '../models/messagesModel.js';
import { sendSms } from '../services/messagingService.js';

export const sendManualMessage = async (req, res) => {
  try {
    const { message, channel, recipientType, recipientTarget } = req.body;
    const sessionUser = req.session?.user;
    const isZoneLeader = sessionUser?.role === 'zone_leader';
    const zoneId = sessionUser?.zoneId;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Message content is required.' } });
    }

    if (channel !== 'sms' && channel !== 'email') {
      return res.status(400).json({ success: false, error: { message: 'Unsupported channel.' } });
    }

    if (isZoneLeader && !zoneId) {
      return res.status(403).json({ success: false, error: { message: 'No zone assigned.' } });
    }

    const normalizedRecipientType = recipientType || 'all';
    const validRecipientTypes = new Set(['all', 'zone', 'gender', 'individual']);
    if (!validRecipientTypes.has(normalizedRecipientType)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid recipientType.' } });
    }

    let recipientMembers = [];
    let recipientLabel = 'All Members';
    let normalizedRecipientTarget = recipientTarget || null;

    if (normalizedRecipientType === 'all') {
      const { members } = await MembersModel.findAll({
        zoneId: isZoneLeader ? zoneId : undefined,
        limit: 10000,
      });
      recipientMembers = members;
      recipientLabel = isZoneLeader ? 'My Zone Members' : 'All Members';
      if (isZoneLeader) {
        normalizedRecipientTarget = zoneId;
      }
    } else if (normalizedRecipientType === 'zone') {
      if (!recipientTarget) {
        return res.status(400).json({ success: false, error: { message: 'recipientTarget is required for zone recipients.' } });
      }
      if (isZoneLeader && recipientTarget !== zoneId) {
        return res.status(403).json({ success: false, error: { message: 'Zone leaders can only message their own zone.' } });
      }
      const targetZoneId = isZoneLeader ? zoneId : recipientTarget;
      const { members } = await MembersModel.findAll({ zoneId: targetZoneId, limit: 10000 });
      recipientMembers = members;
      recipientLabel = isZoneLeader ? 'My Zone' : 'Zone';
      normalizedRecipientTarget = targetZoneId;
    } else if (normalizedRecipientType === 'gender') {
      const allowedGenders = new Set(['Male', 'Female', 'Other']);
      if (!recipientTarget || !allowedGenders.has(recipientTarget)) {
        return res.status(400).json({ success: false, error: { message: 'recipientTarget must be Male, Female, or Other for gender recipients.' } });
      }
      const { members } = await MembersModel.findAll({
        zoneId: isZoneLeader ? zoneId : undefined,
        limit: 10000,
      });
      recipientMembers = members.filter((m) => m.gender === recipientTarget);
      recipientLabel = isZoneLeader ? `${recipientTarget} Members (My Zone)` : `${recipientTarget} Members`;
    } else if (normalizedRecipientType === 'individual') {
      if (!recipientTarget) {
        return res.status(400).json({ success: false, error: { message: 'recipientTarget is required for individual recipients.' } });
      }
      const member = await MembersModel.findById(recipientTarget);
      if (!member) {
        return res.status(404).json({ success: false, error: { message: 'Member not found.' } });
      }
      if (isZoneLeader && member.zone_id !== zoneId) {
        return res.status(403).json({ success: false, error: { message: 'Zone leaders can only message members in their own zone.' } });
      }
      recipientMembers = [member];
      recipientLabel = `${member.first_name} ${member.last_name}`;
      normalizedRecipientTarget = member.id;
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
    const senderUserId = sessionUser?.role === 'zone_leader' ? sessionUser.id : undefined;

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
