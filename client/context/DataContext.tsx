import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Member, Zone, DashboardStats, MemberStatus, ChurchEvent, EventInstance, AttendanceRecord, Message, ManualMessagePayload } from '../types';

// Pagination Interface
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
  currentPage: number;
}

interface DataContextType {
  members: Member[];
  zones: Zone[];
  stats: DashboardStats;
  events: ChurchEvent[];
  instances: EventInstance[];
  attendanceRecords: AttendanceRecord[];
  messages: Message[];
  settings: Record<string, string>;
  
  loading: boolean;
  error: string | null;
  
  // Pagination State
  pagination: Pagination;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setZoneFilter: (zone: string) => void;
  setBaptizedFilter: (baptized: string) => void;
  setGenderFilter: (gender: string) => void;
  fetchMembers: () => Promise<void>;
  fetchAllMembers: () => Promise<Member[]>;
  refreshData: () => Promise<void>;

  addMember: (member: Member) => Promise<void>;
  updateMember: (member: Member) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  bulkUpdateMembers: (ids: string[], updates: Partial<Member>) => Promise<void>;
  bulkDeleteMembers: (ids: string[]) => Promise<void>;
  
  addZone: (zone: Zone) => Promise<Zone | null>;
  updateZone: (zone: Zone) => Promise<Zone | null>;
  deleteZone: (id: string) => Promise<void>;
  
  // Events (API-driven)
  fetchEvents: () => Promise<void>;
  addEvent: (event: Partial<ChurchEvent> & { date?: string }) => Promise<ChurchEvent | null>;
  updateEvent: (event: ChurchEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  // Instances
  fetchInstances: (eventId: string) => Promise<EventInstance[]>;
  fetchAllInstances: (fromDate?: string, toDate?: string) => Promise<EventInstance[]>;
  createInstance: (eventId: string, date: string) => Promise<void>;
  updateInstance: (instanceId: string, data: Partial<EventInstance>) => Promise<void>;
  generateInstances: (eventId: string, weeks?: number) => Promise<void>;
  
  // Attendance (API-driven)
  checkIn: (instanceId: string, memberId?: string, visitorName?: string) => Promise<{ success: boolean; message: string; member?: Member }>;
  fetchAttendance: (instanceId: string) => Promise<AttendanceRecord[]>;
  removeAttendanceRecord: (instanceId: string, memberId: string) => Promise<void>;
  removeAttendanceById: (id: string) => Promise<void>;
  
  attendanceTrends: any[];
  
  sendMessage: (message: ManualMessagePayload) => Promise<{success: boolean; message?: string}>;
  fetchSettings: () => Promise<void>;
  fetchMessages: () => Promise<void>;
  updateSettings: (updates: Record<string, string>) => Promise<boolean>;
  
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const API_BASE = '/api';
const apiFetch = (input: RequestInfo, init: RequestInit = {}) => {
  return fetch(input, { credentials: 'include', ...init });
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalZones: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    visitorMembers: 0,
    unbaptizedMembers: 0,
    recentGrowth: 5.2 
  });
  
  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [baptizedFilter, setBaptizedFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 10,
    offset: 0,
    totalPages: 0,
    currentPage: 1
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Events & Attendance (API-driven)
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [instances, setInstances] = useState<EventInstance[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceTrends, setAttendanceTrends] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // --- Fetch Functions ---

  const fetchStats = useCallback(async () => {
    try {
      const [membersRes, attendanceRes] = await Promise.all([
        apiFetch(`${API_BASE}/members/stats`),
        apiFetch(`${API_BASE}/attendance/stats`)
      ]);
      
      let newStats = {};
      
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        if (membersData.success) {
          newStats = {
            ...newStats,
            totalMembers: membersData.data.total,
            activeMembers: membersData.data.active,
            inactiveMembers: membersData.data.inactive,
            visitorMembers: membersData.data.visitor,
            unbaptizedMembers: membersData.data.unbaptized,
            discoveryDistribution: membersData.data.discoveryDistribution,
            totalMembersTrend: membersData.data.totalMembersTrend,
            activeMembersTrend: membersData.data.activeMembersTrend,
          };
        }
      }

      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        if (attendanceData.success) {
           newStats = {
             ...newStats,
             avgAttendance: attendanceData.data.avg_attendance_percentage
           };
        }
      }
      
      setStats(prev => ({ ...prev, ...newStats }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      if (searchTerm) queryParams.append('search', searchTerm);
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);
      if (zoneFilter !== 'All') queryParams.append('zoneId', zoneFilter);
      if (baptizedFilter !== 'All') queryParams.append('isBaptized', baptizedFilter === 'Baptized' ? 'true' : 'false');
      if (genderFilter !== 'All') queryParams.append('gender', genderFilter);

      const res = await apiFetch(`${API_BASE}/members?${queryParams}`);
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();

      if (data.success) {
        setMembers(data.data.map((m: any) => ({
          ...m,
          role: m.role || 'Member',
        })));
        
        if (data.pagination) {
           setPagination(data.pagination);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching members');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, zoneFilter, baptizedFilter, genderFilter]);

  const fetchAllMembers = useCallback(async (): Promise<Member[]> => {
    try {
      // Fetch a large number to get "all" (e.g. 10,000)
      const res = await apiFetch(`${API_BASE}/members?limit=10000`);
      if (!res.ok) throw new Error('Failed to fetch all members');
      const data = await res.json();
      if (data.success) {
         return data.data.map((m: any) => ({
          ...m,
          role: m.role || 'Member',
        }));
      }
      return [];
    } catch (err) {
       console.error("Failed to fetch all members", err);
       return [];
    }
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/zones`);
      if (!res.ok) throw new Error('Failed to fetch zones');
      const data = await res.json();
      if (data.success) {
        setZones(data.data);
        setStats(prev => ({ ...prev, totalZones: data.data.length }));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ─── Events API ────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (err) {
      console.error('fetchEvents error:', err);
    }
  }, []);

  const addEvent = async (eventData: Partial<ChurchEvent> & { date?: string }): Promise<ChurchEvent | null> => {
    try {
      const res = await apiFetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error('Failed to create event');
      const data = await res.json();
      if (data.success) {
        await fetchEvents();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('addEvent error:', err);
      return null;
    }
  };

  const updateEvent = async (event: ChurchEvent) => {
    try {
      const res = await apiFetch(`${API_BASE}/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (!res.ok) throw new Error('Failed to update event');
      await fetchEvents();
    } catch (err) {
      console.error('updateEvent error:', err);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/events/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete event');
      await fetchEvents();
    } catch (err) {
      console.error('deleteEvent error:', err);
    }
  };

  // ─── Instances API ─────────────────────────────────────
  const fetchInstances = useCallback(async (eventId: string): Promise<EventInstance[]> => {
    try {
      const res = await apiFetch(`${API_BASE}/events/${eventId}/instances`);
      if (!res.ok) throw new Error('Failed to fetch instances');
      const data = await res.json();
      return data.success ? data.data : [];
    } catch (err) {
      console.error('fetchInstances error:', err);
      return [];
    }
  }, []);

  const fetchAllInstances = useCallback(async (fromDate?: string, toDate?: string): Promise<EventInstance[]> => {
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      const res = await apiFetch(`${API_BASE}/events/instances/all?${params}`);
      if (!res.ok) throw new Error('Failed to fetch all instances');
      const data = await res.json();
      if (data.success) {
        setInstances(data.data);
        return data.data;
      }
      return [];
    } catch (err) {
      console.error('fetchAllInstances error:', err);
      return [];
    }
  }, []);

  const createInstance = async (eventId: string, date: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/events/${eventId}/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error('Failed to create instance');
    } catch (err) {
      console.error('createInstance error:', err);
    }
  };

  const updateInstance = async (instanceId: string, data: Partial<EventInstance>) => {
    try {
      const res = await apiFetch(`${API_BASE}/events/instances/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update instance');
      return true;
    } catch (err) {
      console.error('updateInstance error:', err);
      return false;
    }
  };

  const generateInstances = async (eventId: string, weeks: number = 52) => {
    try {
      const res = await apiFetch(`${API_BASE}/events/${eventId}/instances/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks }),
      });
      if (!res.ok) throw new Error('Failed to generate instances');
      return true;
    } catch (err) {
      console.error('generateInstances error:', err);
      return false;
    }
  };

  // ─── Attendance API ────────────────────────────────────
  const checkIn = async (instanceId: string, memberId?: string, visitorName?: string) => {
    try {
      const body: any = { instanceId };
      if (memberId) body.memberId = memberId;
      if (visitorName) body.visitorName = visitorName;

      const res = await apiFetch(`${API_BASE}/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, message: errData?.error?.message || 'Check-in failed' };
      }
      
      const data = await res.json();
      // Use the member returned from the server (which might have been resolved from visitorName)
      // OR fall back to local lookup if memberId was passed explicitly
      const member = data.data.member || (memberId ? members.find(m => m.id === memberId) : undefined);
      
      return { 
        success: true, 
        message: `Checked in ${member ? member.firstName : visitorName || 'Guest'}`,
        member 
      };
    } catch (err) {
      console.error('checkIn error:', err);
      return { success: false, message: 'Check-in failed' };
    }
  };

  const fetchAttendance = useCallback(async (instanceId: string): Promise<AttendanceRecord[]> => {
    try {
      const res = await apiFetch(`${API_BASE}/attendance/instance/${instanceId}`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      if (data.success) {
        setAttendanceRecords(data.data);
        return data.data;
      }
      return [];
    } catch (err) {
      console.error('fetchAttendance error:', err);
      return [];
    }
  }, []);

  const removeAttendanceRecord = async (instanceId: string, memberId: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/attendance/instance/${instanceId}/member/${memberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove attendance record');
    } catch (err) {
      console.error('removeAttendanceRecord error:', err);
    }
  };

  const removeAttendanceById = async (id: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/attendance/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove attendance record');
    } catch (err) {
      console.error('removeAttendanceById error:', err);
    }
  };

  // Core data loader — zones, stats, events, trends
  // Does NOT include members — members have their own reactive useEffect below
  const refreshData = useCallback(async () => {
    await Promise.all([fetchZones(), fetchStats(), fetchEvents()]);
    try {
      const res = await apiFetch(`${API_BASE}/attendance/global-trends`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceTrends(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch trends', e);
    }
  }, [fetchZones, fetchStats, fetchEvents]);

  // Initial Load
  useEffect(() => {
    refreshData();
    fetchSettings();
    fetchMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch members whenever pagination or filters change
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // --- Member Actions ---

  const addMember = async (member: Member) => {
    try {
      const res = await apiFetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
      if (!res.ok) throw new Error('Failed to add member');
      await fetchMembers();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
      throw err;
    }
  };

  const updateMember = async (member: Member) => {
    try {
      const res = await apiFetch(`${API_BASE}/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
      if (!res.ok) throw new Error('Failed to update member');
      await fetchMembers();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
      throw err;
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/members/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete member');
      await fetchMembers();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member');
      throw err;
    }
  };
  
  const bulkUpdateMembers = async (ids: string[], updates: Partial<Member>) => {
     try {
      await Promise.all(ids.map(id => 
           apiFetch(`${API_BASE}/members/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
          })
      ));
      await fetchMembers();
      await fetchStats();
     } catch (err) {
       setError('Failed to bulk update');
     }
  };

  const bulkDeleteMembers = async (ids: string[]) => {
      try {
        await Promise.all(ids.map(id => 
             apiFetch(`${API_BASE}/members/${id}`, {
              method: 'DELETE',
          })
        ));
        await fetchMembers();
        await fetchStats();
       } catch (err) {
         setError('Failed to bulk delete');
       }
  };

  // --- Zone Actions ---

  const addZone = async (zone: Zone): Promise<Zone | null> => {
    try {
      const res = await apiFetch(`${API_BASE}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zone),
      });
      if (res.status === 409) throw new Error('Zone name already exists');
      if (!res.ok) throw new Error('Failed to create zone');
      const data = await res.json();
      fetchZones();
      return data.data || null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateZone = async (zone: Zone): Promise<Zone | null> => {
    try {
      const res = await apiFetch(`${API_BASE}/zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zone),
      });
      if (!res.ok) throw new Error('Failed to update zone');
      const data = await res.json();
      fetchZones();
      return data.data || null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteZone = async (id: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/zones/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete zone');
      fetchZones();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // --- Messaging & Settings ---
  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/messaging/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Map DB snake_case → frontend camelCase Message shape
          setMessages(data.data.map((m: any) => ({
            id: m.id,
            content: m.content,
            channel: m.channel,
            recipientType: m.recipient_type,
            recipientTarget: m.recipient_target,
            recipientLabel: m.recipient_label || m.recipient_type,
            recipientCount: m.recipient_count,
            status: m.status,
            sentAt: m.sent_at,
            type: m.type
          })));
        }
      }
    } catch (err) {
      console.error('fetchMessages error:', err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.data || {});
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const updateSettings = async (updates: Record<string, string>) => {
    try {
      const res = await apiFetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const sendMessage = async (message: ManualMessagePayload) => {
    try {
      const res = await apiFetch(`${API_BASE}/messaging/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.content,
          channel: message.channel,
          audienceType: message.audienceType,
          filters: message.filters,
          memberId: message.memberId,
          memberIds: message.memberIds,
          recipientLabel: message.recipientLabel
        })
      });
      const data = await res.json();

      if (!data.success && message.channel === 'sms') {
        throw new Error(data.error?.message || "Failed to send SMS via API");
      }

      const newMessage: Message = {
        content: message.content,
        channel: message.channel,
        recipientType: message.audienceType,
        recipientTarget: message.audienceType === 'individual'
          ? JSON.stringify(message.memberIds || (message.memberId ? [message.memberId] : []))
          : JSON.stringify(message.filters || {}),
        recipientLabel: message.recipientLabel,
        id: Date.now().toString(),
        sentAt: new Date().toISOString(),
        status: 'sent',
        recipientCount: data.count || message.recipientCount
      };
      setMessages(prev => [newMessage, ...prev]);
      await fetchMessages(); // Reload from DB to ensure persistence
      return { success: true };
    } catch (err) {
      console.error("sendMessage error:", err);
      return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <DataContext.Provider value={{
      members, zones, stats, events, instances, attendanceRecords, messages, attendanceTrends, settings,
      loading, error,
      pagination, setPage, setLimit, setSearchTerm, setStatusFilter, setZoneFilter, setBaptizedFilter, setGenderFilter, fetchMembers,
      addMember, updateMember, deleteMember, bulkUpdateMembers, bulkDeleteMembers,
      addZone, updateZone, deleteZone,
      fetchEvents, addEvent, updateEvent, deleteEvent,
      fetchInstances, fetchAllInstances, createInstance, updateInstance, generateInstances,
      checkIn, fetchAttendance, removeAttendanceRecord, removeAttendanceById,
      sendMessage, fetchAllMembers, refreshData, fetchSettings, fetchMessages, updateSettings,
      theme, toggleTheme
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
