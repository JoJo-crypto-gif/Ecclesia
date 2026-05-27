import AttendanceModel from '../models/attendanceModel.js';
import EventsService from './eventsService.js';
import AutoStatusService from './autoStatusService.js';

const transformRecord = (row) => ({
  id: row.id,
  instanceId: row.instance_id,
  memberId: row.member_id,
  visitorName: row.visitor_name,
  checkedInAt: row.checked_in_at,
  status: row.status,
  // Joined member fields
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  memberStatus: row.member_status,
});

const transformMember = (row, { publicProfile = false } = {}) => {
  if (publicProfile) {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      otherName: row.other_name,
      titles: Array.isArray(row.titles) ? row.titles : [],
      status: row.status,
      role: row.role,
      avatarUrl: row.avatar_url,
    };
  }

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    otherName: row.other_name,
    titles: Array.isArray(row.titles) ? row.titles : [],
    email: row.email,
    phone: row.phone,
    address: row.address,
    status: row.status,
    zoneId: row.zone_id,
    joinDate: row.join_date,
    avatarUrl: row.avatar_url,
    notes: row.notes,
    dob: row.dob,
    gender: row.gender,
    role: row.role,
    occupation: row.occupation,
    emergencyContact: row.emergency_contact,
    emergencyPhone: row.emergency_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const AttendanceService = {
  async checkIn(data, options = {}) {
    let { instanceId, memberId, visitorName, status } = data;
    const {
      identifierMode = 'all',
      allowIdentifierFallbackToVisitor = true,
      memberPayload = 'private',
    } = options;

    const instance = await EventsService.getInstance(instanceId);
    if (!instance) {
      const err = new Error('Event instance not found');
      err.statusCode = 404;
      throw err;
    }

    // If no memberId is provided, optionally resolve the identifier to a member.
    let member = null;
    if (!memberId && visitorName) {
      const lookupFn = identifierMode === 'contact_only'
        ? AttendanceModel.findMemberByContactIdentifier.bind(AttendanceModel)
        : AttendanceModel.findMemberByIdentifier.bind(AttendanceModel);
      member = await lookupFn(visitorName, { zoneId: instance.zoneId || undefined });
      if (member) {
        memberId = member.id;
        visitorName = null;
      } else if (!allowIdentifierFallbackToVisitor) {
        const err = new Error('Member not found');
        err.statusCode = 404;
        throw err;
      }
    } else if (memberId) {
      member = await AttendanceModel.findMemberById(memberId);
      if (!member) {
        const err = new Error('Member not found');
        err.statusCode = 404;
        throw err;
      }
    }

    if (member && instance.zoneId && member.zone_id !== instance.zoneId) {
      const err = new Error('This member does not belong to the zone for this event');
      err.statusCode = 403;
      throw err;
    }

    const row = await AttendanceModel.checkIn({ instanceId, memberId, visitorName, status });

    // Auto-reactivate: if the checked-in member is currently Inactive, set them back to Active
    if (memberId && member && member.status === 'Inactive') {
      const eventName = instance.eventName || instance.event_name || '';
      AutoStatusService.reactivateMember(memberId, { eventName }).catch(err =>
        console.error('[AutoStatus] Error in reactivateMember:', err)
      );
    }

    return {
      ...row,
      member: member ? transformMember(member, { publicProfile: memberPayload === 'public' }) : null,
    };
  },

  async listByInstance(instanceId) {
    const rows = await AttendanceModel.findByInstance(instanceId);
    return rows.map(transformRecord);
  },

  async getById(id) {
    return AttendanceModel.findById(id);
  },

  async remove(id) {
    return AttendanceModel.remove(id);
  },

  async removeByInstanceAndMember(instanceId, memberId) {
    return AttendanceModel.removeByInstanceAndMember(instanceId, memberId);
  },

  async getStats(zoneId) {
    const row = await AttendanceModel.getStats({ zoneId });
    return {
      totalCheckins: parseInt(row.total_checkins || '0', 10),
      uniqueMembers: parseInt(row.unique_members || '0', 10),
      totalVisitors: parseInt(row.total_visitors || '0', 10),
      completedEvents: parseInt(row.completed_events || '0', 10),
      upcomingEvents: parseInt(row.upcoming_events || '0', 10),
    };
  },

  async getMemberHistory(memberId, options) {
    const rows = await AttendanceModel.findByMember(memberId, options);
    return rows.map(r => ({
      id: r.id,
      date: r.date,
      eventName: r.event_name,
      eventType: r.event_type,
      checkedInAt: r.checked_in_at,
      status: r.status,
    }));
  },

  async getTrends(eventId, options) {
    const rows = await AttendanceModel.getTrends(eventId, options);
    return rows.map(r => ({
      date: r.date,
      instanceStatus: r.instance_status,
      attendanceCount: parseInt(r.attendance_count || '0', 10),
    }));
  },

  async getGlobalTrends(options) {
    const rows = await AttendanceModel.getGlobalTrends(options);
    return rows.map(r => ({
      name: r.month_name,
      attendance: parseInt(r.attendance_count || '0', 10),
    }));
  },

  async getDynamicTrends(options) {
    const rows = await AttendanceModel.getDynamicTrends(options);
    
    // Format labels based on period
    return rows.map(r => {
      const d = new Date(r.period_date);
      let name = '';
      
      switch (options.period) {
        case 'year':
          name = d.getFullYear().toString();
          break;
        case 'week':
          name = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case 'month':
        default:
          name = d.toLocaleDateString('en-US', { month: 'short' });
          break;
      }
      return {
        name,
        attendance: parseInt(r.attendance_count || '0', 10),
      };
    });
  },

  async getMemberAnalytics(memberId) {
    const row = await AttendanceModel.getMemberAnalytics(memberId);
    const totalAttended = parseInt(row.total_attended || '0', 10);
    const totalPossible = parseInt(row.total_possible || '0', 10);
    const rate = totalPossible > 0
      ? Math.round((totalAttended / totalPossible) * 1000) / 10
      : 0;

    return {
      totalAttended,
      totalPossible,
      attendanceRate: rate,
      byEventType: (row.by_event_type || []).map(r => ({
        type: r.type || 'Unknown',
        count: parseInt(r.count || '0', 10),
      })),
      monthlyTrend: (row.monthly_trend || []).map(r => ({
        month: r.month,
        count: parseInt(r.count || '0', 10),
      })),
    };
  },

  async getZoneHealth(options = {}) {
    const rows = await AttendanceModel.getZoneHealth(options);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      totalMembers: r.total_members,
      activeAttendees: r.active_attendees,
      totalCheckins: r.total_checkins,
      engagementRate: parseFloat(r.engagement_rate) || 0,
    }));
  },

  async getDemographicAttendance(options = {}) {
    const rows = await AttendanceModel.getDemographicAttendance(options);
    return rows.map(r => ({
      ageGroup: r.age_group,
      totalMembers: r.total_members,
      activeAttendees: r.active_attendees,
      totalCheckins: r.total_checkins,
      engagementRate: parseFloat(r.engagement_rate) || 0,
    }));
  },

  async getReportOverview(options = {}) {
    const row = await AttendanceModel.getReportOverview(options);
    return {
      totalActiveMembers: parseInt(row.total_active_members || '0', 10),
      totalCompletedEvents: parseInt(row.total_completed_events || '0', 10),
      totalCheckins: parseInt(row.total_checkins || '0', 10),
      avgAttendancePercentage: parseInt(row.avg_attendance_percentage || '0', 10),
    };
  },
};
export default AttendanceService;
