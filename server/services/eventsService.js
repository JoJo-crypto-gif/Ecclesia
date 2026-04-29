import EventsModel from '../models/eventsModel.js';

// Transform snake_case DB rows to camelCase for the API
const transformEvent = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  location: row.location,
  startTime: row.start_time,
  isRecurring: row.is_recurring,
  recurrenceRule: row.recurrence_rule,
  dayOfWeek: row.day_of_week,
  isActive: row.is_active,
  zoneId: row.zone_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const transformInstance = (row) => ({
  id: row.id,
  eventId: row.event_id,
  date: row.date,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at,
  // Joined fields
  eventName: row.event_name,
  eventType: row.event_type,
  startTime: row.start_time,
  isRecurring: row.is_recurring,
  location: row.location,
  zoneId: row.zone_id,
  attendanceCount: parseInt(row.attendance_count || '0', 10),
  nameOverride: row.name_override,
  typeOverride: row.type_override,
  locationOverride: row.location_override,
});

const EventsService = {
  async list(filters) {
    const rows = await EventsModel.findAll(filters);
    return rows.map(transformEvent);
  },

  async getById(id) {
    const row = await EventsModel.findById(id);
    return row ? transformEvent(row) : null;
  },

  async create(data) {
    const row = await EventsModel.create(data);
    const event = transformEvent(row);

    // Auto-generate instances for recurring events
    if (data.isRecurring && data.recurrenceRule) {
      await EventsModel.generateInstances(event.id, 8);
    } else if (data.date) {
      // For one-off events, create a single instance
      await EventsModel.createInstance(event.id, data.date);
    }

    return event;
  },

  async update(id, data) {
    const row = await EventsModel.update(id, data);
    return row ? transformEvent(row) : null;
  },

  async delete(id) {
    return EventsModel.delete(id);
  },

  // ─── Instances ─────────────────────────────────────────
  async listInstances(eventId, filters) {
    const rows = await EventsModel.findInstances(eventId, filters);
    return rows.map(transformInstance);
  },

  async listAllInstances(filters) {
    const rows = await EventsModel.findAllInstances(filters);
    return rows.map(transformInstance);
  },

  async getInstance(instanceId) {
    const row = await EventsModel.findInstanceById(instanceId);
    return row ? transformInstance(row) : null;
  },

  async updateInstance(instanceId, data) {
    const row = await EventsModel.updateInstance(instanceId, data);
    return row ? transformInstance(row) : null;
  },

  async deleteInstance(instanceId) {
    return EventsModel.deleteInstance(instanceId);
  },

  async generateInstances(eventId, weeks) {
    const rows = await EventsModel.generateInstances(eventId, weeks);
    return rows.map(r => ({
      id: r.id,
      eventId: r.event_id,
      date: r.date,
      status: r.status,
    }));
  },

  async createInstance(eventId, date, notes) {
    const row = await EventsModel.createInstance(eventId, date, notes);
    return row ? { id: row.id, eventId: row.event_id, date: row.date, status: row.status } : null;
  },

  async syncPastInstances() {
    return EventsModel.syncPastScheduledInstances();
  },
};

export default EventsService;
