
export enum MemberStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Visitor = 'Visitor',
}

export interface Zone {
  id: string;
  name: string;
  leaderId?: string;
  description?: string;
  meetingTime?: string;
  memberCount?: number;
  createdAt: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  titles?: string[];
  email: string;
  phone: string;
  address?: string;
  status: MemberStatus;
  zoneId?: string; // Links to a Zone
  joinDate: string;
  avatarUrl?: string;
  notes?: string;
  
  // New detailed fields
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  role?: string; // e.g., Member, Worker, Choir, Usher, Deacon
  occupation?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  discoverySource?: string;
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Separated' | null;
  marriageDate?: string | null;
  spouseName?: string | null;
  spousePhone?: string | null;
  
  // Parent details
  motherName?: string;
  motherStatus?: 'Alive' | 'Deceased' | 'Unknown' | null;
  fatherName?: string;
  fatherStatus?: 'Alive' | 'Deceased' | 'Unknown' | null;

  // Baptism details
  isBaptized?: boolean;
  baptismDate?: string | null;
  baptizedBy?: string | null;
  baptismMethod?: 'Immersion' | 'Sprinkling' | null;
  baptismChurch?: string | null;

  // Children
  children?: MemberChild[];
}

export interface MemberChild {
  name: string;
  phone?: string;
}

export interface DashboardStats {
  totalMembers: number;
  totalZones: number;
  activeMembers: number;
  inactiveMembers: number;
  visitorMembers: number;
  unbaptizedMembers: number;
  recentGrowth: number; // percentage
  totalMembersTrend?: number;
  activeMembersTrend?: number;
  avgAttendance?: number;
  discoveryDistribution?: { name: string; value: number }[];
}

export interface PermissionSet {
  read: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  role: string;
  roleId?: string;
  permissions?: Record<string, PermissionSet>;
  memberId?: string;
  zoneId?: string;
}

export interface ChurchEvent {
  id: string;
  name: string;
  type: string;
  location?: string;
  startTime?: string;
  isRecurring: boolean;
  recurrenceRule?: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  dayOfWeek?: number;
  isActive: boolean;
  zoneId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventInstance {
  id: string;
  eventId: string;
  date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
  // Joined fields from event
  eventName?: string;
  eventType?: string;
  startTime?: string;
  isRecurring?: boolean;
  location?: string;
  zoneId?: string | null;
  attendanceCount?: number;
  nameOverride?: string;
  typeOverride?: string;
  locationOverride?: string;
}

export interface AttendanceRecord {
  id: string;
  instanceId: string;
  memberId?: string;
  visitorName?: string;
  checkedInAt: string;
  status: string;
  // Joined member fields
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  memberStatus?: string;
}


export interface Message {
  id: string;
  subject?: string;
  content: string;
  channel: 'email' | 'sms';
  recipientType: 'all' | 'zone' | 'gender' | 'individual' | 'filter' | 'birthday' | 'anniversary' | 'absentee';
  recipientTarget?: string;
  recipientLabel: string;
  sentAt: string;
  status: 'sent' | 'scheduled' | 'failed';
  recipientCount: number;
}

export interface ManualMessagePayload {
  subject?: string;
  content: string;
  channel: 'email' | 'sms';
  audienceType: 'filter' | 'individual';
  filters?: {
    zoneId?: string;
    gender?: string;
    isBaptized?: string;
  };
  memberId?: string;
  memberIds?: string[];
  recipientLabel: string;
  recipientCount: number;
}
