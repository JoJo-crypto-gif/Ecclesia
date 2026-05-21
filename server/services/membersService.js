import MembersModel from '../models/membersModel.js';

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseYmd = (rawDate) => {
  if (!rawDate) return null;

  // Handle native Date values from DB drivers.
  if (rawDate instanceof Date) {
    return {
      year: rawDate.getUTCFullYear(),
      month: rawDate.getUTCMonth() + 1,
      day: rawDate.getUTCDate()
    };
  }

  const raw = String(rawDate).trim();
  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return {
      year: parseInt(ymdMatch[1], 10),
      month: parseInt(ymdMatch[2], 10),
      day: parseInt(ymdMatch[3], 10)
    };
  }

  // Fallback for odd string formats.
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      year: parsed.getUTCFullYear(),
      month: parsed.getUTCMonth() + 1,
      day: parsed.getUTCDate()
    };
  }

  return null;
};

const buildOccurrence = (year, month, day) => {
  const fallback = new Date(year, month, 0);
  const date = new Date(year, month - 1, day);

  // Handle invalid calendar dates like Feb 29 on non-leap years.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return fallback;
  }

  return date;
};

const getRangeForFilter = (referenceDate, period, window) => {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  // "today" window — return just today's range regardless of period
  if (window === 'today') {
    const start = new Date(ref);
    const end = new Date(ref);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'week') {
    const dayOfWeek = ref.getDay();
    const start = new Date(ref);
    start.setDate(ref.getDate() - dayOfWeek + (window === 'upcoming' ? 7 : 0));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Month filter
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const start = window === 'upcoming'
    ? new Date(year, month + 1, 1)
    : new Date(year, month, 1);
  const end = window === 'upcoming'
    ? new Date(year, month + 2, 0, 23, 59, 59, 999)
    : new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { start, end };
};

const findOccurrenceInRange = (rawDate, rangeStart, rangeEnd) => {
  const parsed = parseYmd(rawDate);
  if (!parsed) return null;

  const startYear = rangeStart.getFullYear();
  const endYear = rangeEnd.getFullYear();
  const candidates = [];

  for (let year = startYear - 1; year <= endYear + 1; year++) {
    const candidate = buildOccurrence(year, parsed.month, parsed.day);
    if (candidate >= rangeStart && candidate <= rangeEnd) {
      candidates.push(candidate);
    }
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] || null;
};

const normalizeTitles = (titles) => {
  if (!Array.isArray(titles)) return [];

  const seen = new Set();
  return titles
    .map((title) => (typeof title === 'string' ? title.trim() : ''))
    .filter((title) => {
      if (!title) return false;
      const key = title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizeOptionalString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || null;
};

/**
 * Members business logic layer.
 * Handles validation, transformation, and orchestration.
 */
const MembersService = {
  /**
   * List members with filters.
   */
  async list(filters) {
    const result = await MembersModel.findAll(filters);

    return {
      members: result.members.map(transformMember),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total,
      },
    };
  },

  /**
   * Get a single member by ID.
   */
  async getById(id) {
    const member = await MembersModel.findById(id);
    if (!member) {
      const err = new Error('Member not found');
      err.statusCode = 404;
      throw err;
    }
    return transformMember(member);
  },

  /**
   * Get members with birthdays in a specific month.
   */
  async getBirthdaysByMonth(monthIndex, userRole, userZoneId) {
    const filterZone = (userRole !== 'admin' && userZoneId) ? userZoneId : null;
    const rows = await MembersModel.getBirthdaysByMonth(monthIndex, filterZone);
    return rows.map(r => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      avatarUrl: r.avatar_url,
      dob: r.dob ? new Date(r.dob).toISOString().split('T')[0] : null,
    }));
  },

  /**
   * Get celebration members by filter type and date window.
   */
  async getCelebrations({ type, period, window, referenceDate, userRole, userZoneId }) {
    const filterZone = (userRole !== 'admin' && userZoneId) ? userZoneId : null;
    const rows = await MembersModel.getCelebrationMembers(type, filterZone);
    const ref = referenceDate
      ? new Date(`${referenceDate}T00:00:00`)
      : new Date();

    if (Number.isNaN(ref.getTime())) {
      const err = new Error('Invalid reference date');
      err.statusCode = 400;
      throw err;
    }

    const { start, end } = getRangeForFilter(ref, period, window);
    const dateField = type === 'anniversary' ? 'marriage_date' : (type === 'baptism_anniversary' ? 'baptism_date' : 'dob');

    const celebrations = rows
      .map((row) => {
        const rawDate = row[dateField];
        const occurrenceDate = findOccurrenceInRange(rawDate, start, end);
        if (!occurrenceDate) return null;

        const parsed = parseYmd(rawDate);
        if (!parsed) return null;

        const milestone = occurrenceDate.getFullYear() - parsed.year;
        return {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
          date: formatDate(occurrenceDate),
          day: occurrenceDate.getDate(),
          month: occurrenceDate.getMonth() + 1,
          type,
          milestone,
          milestoneLabel: type === 'birthday' ? 'Turning' : (type === 'baptism_anniversary' ? 'Years Since Baptism' : 'Years Married'),
          maritalStatus: row.marital_status || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      rangeStart: formatDate(start),
      rangeEnd: formatDate(end),
      celebrations,
    };
  },

  /**
   * Create a new member.
   */
  async create(data) {
    const normalizedData = {
      ...data,
      otherName: normalizeOptionalString(data.otherName),
      titles: normalizeTitles(data.titles),
    };

    // Check for duplicate email
    const existing = await MembersModel.findByEmail(normalizedData.email);
    if (existing) {
      const err = new Error('A member with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    const member = await MembersModel.create(normalizedData);
    return transformMember(member);
  },

  /**
   * Update an existing member.
   */
  async update(id, data) {
    const normalizedData = { ...data };
    if (Object.prototype.hasOwnProperty.call(data, 'otherName')) {
      normalizedData.otherName = normalizeOptionalString(data.otherName);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'titles')) {
      normalizedData.titles = normalizeTitles(data.titles);
    }

    // Check member exists
    const existing = await MembersModel.findById(id);
    if (!existing) {
      const err = new Error('Member not found');
      err.statusCode = 404;
      throw err;
    }

    // If email is being changed, check it's not taken
    if (normalizedData.email && normalizedData.email !== existing.email) {
      const emailTaken = await MembersModel.findByEmail(normalizedData.email);
      if (emailTaken) {
        const err = new Error('A member with this email already exists');
        err.statusCode = 409;
        throw err;
      }
    }

    const member = await MembersModel.update(id, normalizedData);
    return transformMember(member);
  },

  /**
   * Delete a member.
   */
  async delete(id) {
    const member = await MembersModel.delete(id);
    if (!member) {
      const err = new Error('Member not found');
      err.statusCode = 404;
      throw err;
    }
    return transformMember(member);
  },

  /**
   * Get member statistics.
   */
  async getStats(zoneId) {
    return MembersModel.getStats(zoneId);
  },

  /**
   * Get historical active members count by age group over the last 6 months.
   */
  async getAgeTrends(zoneId) {
    return MembersModel.getAgeTrends(zoneId);
  },
};

/**
 * Transform DB row (snake_case) to API response (camelCase).
 * Matches the frontend Member interface.
 */
function transformMember(row) {
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
    joinDate: row.join_date ? new Date(row.join_date).toISOString().split('T')[0] : null,
    avatarUrl: row.avatar_url,
    notes: row.notes,
    dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
    gender: row.gender,
    role: row.role,
    occupation: row.occupation,
    emergencyContact: row.emergency_contact,
    emergencyPhone: row.emergency_phone,
    discoverySource: row.discovery_source,
    maritalStatus: row.marital_status,
    marriageDate: row.marriage_date ? new Date(row.marriage_date).toISOString().split('T')[0] : null,
    spouseName: row.spouse_name,
    spousePhone: row.spouse_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    motherName: row.mother_name,
    motherStatus: row.mother_status,
    fatherName: row.father_name,
    fatherStatus: row.father_status,
    isBaptized: row.is_baptized,
    baptismDate: row.baptism_date ? new Date(row.baptism_date).toISOString().split('T')[0] : null,
    baptizedBy: row.baptized_by,
    baptismMethod: row.baptism_method,
    baptismChurch: row.baptism_church,
    children: row.children || [],
    exMemberReason: row.ex_member_reason,
    landmark: row.landmark,
    whatsapp: row.whatsapp,
    spouseChurch: row.spouse_church,
    homeTown: row.home_town,
    brothersKeeper: row.brothers_keeper,
    education: row.education,
    interest: row.interest
  };
}

export default MembersService;
