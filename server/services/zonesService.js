import ZonesModel from '../models/zonesModel.js';
import MembersModel from '../models/membersModel.js';

const ZonesService = {
  async list() {
    const zones = await ZonesModel.findAll();
    return zones.map(transformZone);
  },

  async getById(id) {
    const zone = await ZonesModel.findById(id);
    if (!zone) {
      const err = new Error('Zone not found');
      err.statusCode = 404;
      throw err;
    }
    return transformZone(zone);
  },

  async create(data) {
    const leaderId = normalizeLeaderId(data.leaderId);
    await ensureLeaderExists(leaderId);
    const existing = await ZonesModel.findByName(data.name);
    if (existing) {
      const err = new Error('Zone name already exists');
      err.statusCode = 409;
      throw err;
    }
    const zone = await ZonesModel.create({ ...data, leaderId });

    if (leaderId) {
      await MembersModel.update(leaderId, { zoneId: zone.id });
    }
    return transformZone(zone);
  },

  async update(id, data) {
    const existing = await ZonesModel.findById(id);
    if (!existing) {
      const err = new Error('Zone not found');
      err.statusCode = 404;
      throw err;
    }

    const leaderId = normalizeLeaderId(data.leaderId);
    if (data.leaderId !== undefined) {
      await ensureLeaderExists(leaderId);
    }

    if (data.name && data.name !== existing.name) {
      const nameTaken = await ZonesModel.findByName(data.name);
      if (nameTaken) {
        const err = new Error('Zone name already exists');
        err.statusCode = 409;
        throw err;
      }
    }

    const updateData = { ...data };
    if (data.leaderId !== undefined) {
      updateData.leaderId = leaderId;
    } else {
      delete updateData.leaderId;
    }
    const zone = await ZonesModel.update(id, updateData);
    if (leaderId) {
      await MembersModel.update(leaderId, { zoneId: zone.id });
    }
    return transformZone(zone);
  },

  async delete(id) {
    const zone = await ZonesModel.delete(id);
    if (!zone) {
      const err = new Error('Zone not found');
      err.statusCode = 404;
      throw err;
    }
    return transformZone(zone);
  }
};

function transformZone(row) {
  return {
    id: row.id,
    name: row.name,
    leaderId: row.leader_id,
    description: row.description,
    meetingTime: row.meeting_time,
    memberCount: row.member_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeLeaderId(leaderId) {
  if (leaderId === '' || leaderId === undefined) return null;
  return leaderId;
}

async function ensureLeaderExists(leaderId) {
  if (!leaderId) return;
  const member = await MembersModel.findById(leaderId);
  if (!member) {
    const err = new Error('Zone leader must be an existing member');
    err.statusCode = 400;
    throw err;
  }
}

export default ZonesService;
