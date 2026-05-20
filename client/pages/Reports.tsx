import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { FileBarChart, Users, Calendar, BarChart3, Search, UserCheck, ShieldAlert, HeartPulse, CheckCircle2, Download, Printer, CheckSquare, Square, Columns, ChevronDown, X } from 'lucide-react';
import { Member, EventInstance, AttendanceRecord, User } from '../types';
import Logo from '../components/Logo';
import ReportSessionPickerModal from '../components/attendance/ReportSessionPickerModal';
import ViewMemberModal from '../components/members/ViewMemberModal';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { apiFetch } from '../utils/api';
import { formatOccupation, parseOccupation } from '../utils/occupation';
import CustomSelect from '../components/CustomSelect';

const searchFieldOptions = [
  { value: 'all', label: 'All Fields' },
  { value: 'firstName', label: 'First Name (Identity)' },
  { value: 'lastName', label: 'Last Name (Identity)' },
  { value: 'otherName', label: 'Other Name (Identity)' },
  { value: 'gender', label: 'Gender (Identity)' },
  { value: 'age', label: 'Age (Identity)' },
  { value: 'maritalStatus', label: 'Marital Status (Identity)' },
  { value: 'email', label: 'Email (Contact)' },
  { value: 'phone', label: 'Phone (Contact)' },
  { value: 'address', label: 'Address (Contact)' },
  { value: 'zone', label: 'Zone (Church)' },
  { value: 'role', label: 'Role (Church)' },
  { value: 'status', label: 'Status (Church)' },
  { value: 'exMemberReason', label: 'Reason for Leaving (Church)' },
  { value: 'joinDate', label: 'Join Date (Church)' },
  { value: 'discoverySource', label: 'Discovery Source (Church)' },
  { value: 'employmentStatus', label: 'Employment Status (Employment)' },
  { value: 'employmentRole', label: 'Job Title / Major (Employment)' },
  { value: 'employmentOrg', label: 'Workplace / School (Employment)' },
  { value: 'employmentLocation', label: 'School Location (Employment)' },
  { value: 'emergencyContact', label: 'Emergency Contact (Emergency)' },
  { value: 'emergencyPhone', label: 'Emergency Phone (Emergency)' },
  { value: 'spouseName', label: 'Spouse Name (Family)' },
  { value: 'motherName', label: 'Mother Name (Family)' },
  { value: 'fatherName', label: 'Father Name (Family)' },
  { value: 'isBaptized', label: 'Baptized (yes/no) (Baptism)' },
];

const calculateAge = (dobString?: string): number | null => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

interface ReportOverview {
  totalActiveMembers: number;
  totalCompletedEvents: number;
  totalCheckins: number;
  avgAttendancePercentage: number;
}

interface ZoneHealth {
  id: string;
  name: string;
  totalMembers: number;
  engagementRate: number;
}

interface DemographicData {
  ageGroup: string;
  totalMembers: number;
  engagementRate: number;
}

interface MemberAnalytics {
  attendanceRate: number;
  totalAttended: number;
  totalPossible: number;
  byEventType: Array<{ type: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

interface MemberHistoryItem {
  date: string;
  eventName: string;
  eventType: string;
  checkedInAt: string;
  status: string;
}

const Reports: React.FC<{ user: User | null }> = ({ user }) => {
  const { settings, members, fetchAllMembers, attendanceTrends, zones, events, fetchInstances, theme } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'member' | 'event' | 'membership'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const churchName = settings.church_name || 'Ecclesia';
  const churchLogo = settings.church_logo || '';

  // Dashboard state
  const [overviewStats, setOverviewStats] = useState<ReportOverview | null>(null);
  const [zoneHealth, setZoneHealth] = useState<ZoneHealth[]>([]);
  const [demographics, setDemographics] = useState<DemographicData[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Member Report state
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberAnalytics, setMemberAnalytics] = useState<MemberAnalytics | null>(null);
  const [memberHistory, setMemberHistory] = useState<MemberHistoryItem[]>([]);
  const [loadingMemberData, setLoadingMemberData] = useState(false);

  // Event Report state
  const [selectedReportEventId, setSelectedReportEventId] = useState<string>('');
  const [reportInstances, setReportInstances] = useState<EventInstance[]>([]);
  const [selectedReportInstanceId, setSelectedReportInstanceId] = useState<string>('');
  const [eventAttendanceRecords, setEventAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingEventAttendance, setLoadingEventAttendance] = useState(false);
  const [eventReportSubTab, setEventReportSubTab] = useState<'present' | 'absent' | 'all'>('all');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false);
  const [viewedEventMember, setViewedEventMember] = useState<Member | null>(null);

  // Membership List state
  const [membershipSearchField, setMembershipSearchField] = useState('all');
  const [membershipSearchQuery, setMembershipSearchQuery] = useState('');
  const [membershipSelectedIds, setMembershipSelectedIds] = useState<Set<string>>(new Set());
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['firstName', 'lastName', 'phone', 'zone', 'role', 'status', 'exMemberReason']));

  const MEMBERSHIP_COLUMNS = useMemo(() => [
    { id: 'firstName',       label: 'First Name' },
    { id: 'lastName',        label: 'Last Name' },
    { id: 'otherName',       label: 'Other Name' },
    { id: 'email',           label: 'Email' },
    { id: 'phone',           label: 'Phone' },
    { id: 'address',         label: 'Address' },
    { id: 'zone',            label: 'Zone' },
    { id: 'role',            label: 'Role' },
    { id: 'status',          label: 'Status' },
    { id: 'exMemberReason',  label: 'Reason for Leaving' },
    { id: 'gender',          label: 'Gender' },
    { id: 'dob',             label: 'Date of Birth' },
    { id: 'maritalStatus',   label: 'Marital Status' },
    { id: 'employmentStatus',   label: 'Employment Status' },
    { id: 'employmentRole',     label: 'Job Title / Major' },
    { id: 'employmentOrg',      label: 'Workplace / School' },
    { id: 'employmentLocation', label: 'School Location' },
    { id: 'joinDate',        label: 'Join Date' },
    { id: 'discoverySource', label: 'Discovery Source' },
    { id: 'emergencyContact',label: 'Emergency Contact' },
    { id: 'emergencyPhone',  label: 'Emergency Phone' },
    { id: 'isBaptized',      label: 'Baptized' },
    { id: 'baptismDate',     label: 'Baptism Date' },
    { id: 'baptizedBy',      label: 'Baptized By' },
    { id: 'spouseName',      label: 'Spouse Name' },
    { id: 'spousePhone',     label: 'Spouse Phone' },
    { id: 'motherName',      label: 'Mother Name' },
    { id: 'fatherName',      label: 'Father Name' },
  ], []);

  // Fetch overview data
  useEffect(() => {
    if (activeTab === 'overview' && !overviewStats) {
      const fetchOverview = async () => {
        try {
          const [overviewRes, zoneRes, demoRes] = await Promise.all([
            apiFetch('/api/attendance/report-overview').then(r => r.json()),
            apiFetch('/api/attendance/zone-health').then(r => r.json()),
            apiFetch('/api/attendance/demographics').then(r => r.json())
          ]);
          if (overviewRes.success) setOverviewStats(overviewRes.data);
          if (zoneRes.success) setZoneHealth(zoneRes.data);
          if (demoRes.success) setDemographics(demoRes.data);
        } catch (err) {
          console.error("Failed to load overview data", err);
        } finally {
          setLoadingOverview(false);
        }
      };
      fetchOverview();
    }
  }, [activeTab, overviewStats]);

  // Pre-load all members for searchable dropdown
  useEffect(() => {
    if ((activeTab === 'member' || activeTab === 'event' || activeTab === 'membership') && allMembers.length === 0) {
      fetchAllMembers().then(setAllMembers);
    }
  }, [activeTab, allMembers.length, fetchAllMembers]);

  // Fetch individual member data when selected
  useEffect(() => {
    if (selectedMember) {
      const fetchMemberData = async () => {
        setLoadingMemberData(true);
        try {
          const [analyticsRes, historyRes] = await Promise.all([
            apiFetch(`/api/attendance/member/${selectedMember.id}/analytics`).then(r => r.json()),
            apiFetch(`/api/attendance/member/${selectedMember.id}`).then(r => r.json())
          ]);
          if (analyticsRes.success) setMemberAnalytics(analyticsRes.data);
          if (historyRes.success) setMemberHistory(historyRes.data);
        } catch (err) {
          console.error("Failed to load member analytics", err);
        } finally {
          setLoadingMemberData(false);
        }
      };
      fetchMemberData();
    }
  }, [selectedMember]);

  useEffect(() => {
    // If the event ID changes (via modal), we need to fetch its instances to know which one was selected and display its date.
    if (activeTab === 'event' && selectedReportEventId) {
      fetchInstances(selectedReportEventId).then(data => {
        const sorted = data
          .filter(i => i.status !== 'cancelled')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setReportInstances(sorted);
      });
    }
  }, [activeTab, selectedReportEventId, fetchInstances]);

  useEffect(() => {
    if (activeTab === 'event' && selectedReportInstanceId) {
      setLoadingEventAttendance(true);
      apiFetch(`/api/attendance/instance/${selectedReportInstanceId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const presentRecords = data.data as AttendanceRecord[];
            const event = events.find(e => e.id === selectedReportEventId);
            
            // If we have all members, we can calculate absent ones
            if (allMembers.length > 0) {
              const eligibleMembers = allMembers.filter(m => 
                m.status === 'Active' && (!event?.zoneId || m.zoneId === event.zoneId)
              );
              
              const presentMemberIds = new Set(presentRecords.map(r => r.memberId).filter(Boolean));
              
              const absentRecords: AttendanceRecord[] = eligibleMembers
                .filter(m => !presentMemberIds.has(m.id))
                .map(m => ({
                  id: `absent-${m.id}`,
                  instanceId: selectedReportInstanceId,
                  memberId: m.id,
                  status: 'Absent',
                  checkedInAt: '',
                  firstName: m.firstName,
                  lastName: m.lastName,
                  avatarUrl: m.avatarUrl,
                  email: m.email,
                  phone: m.phone,
                  memberStatus: m.status
                }));
                
              setEventAttendanceRecords([...presentRecords, ...absentRecords]);
            } else {
              setEventAttendanceRecords(presentRecords);
            }
          }
        })
        .finally(() => setLoadingEventAttendance(false));
    }
  }, [activeTab, selectedReportInstanceId, allMembers, events, selectedReportEventId]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return allMembers
      .filter(m => 
        m.firstName.toLowerCase().includes(q) || 
        m.lastName.toLowerCase().includes(q) || 
        (m.phone && m.phone.includes(q))
      )
      .slice(0, 10);
  }, [searchQuery, allMembers]);

  const filteredEventAttendance = useMemo(() => {
    return eventAttendanceRecords
      .filter(r => {
        const matchesTab = eventReportSubTab === 'all' || r.status.toLowerCase() === eventReportSubTab;
        const q = eventSearchQuery.toLowerCase();
        const matchesSearch = !q || 
          (r.firstName || '').toLowerCase().includes(q) || 
          (r.lastName || '').toLowerCase().includes(q) || 
          (r.phone || '').includes(q);
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
  }, [eventAttendanceRecords, eventReportSubTab, eventSearchQuery]);

  const filteredMembershipList = useMemo(() => {
    if (!membershipSearchQuery) return allMembers;
    const q = membershipSearchQuery.toLowerCase();
    return allMembers.filter(m => {
      const fv = (val: string | undefined | null | boolean) => String(val ?? '').toLowerCase();
      const zoneName = zones.find(z => z.id === m.zoneId)?.name || '';
      switch (membershipSearchField) {
        case 'firstName':        return fv(m.firstName).includes(q);
        case 'lastName':         return fv(m.lastName).includes(q);
        case 'otherName':        return fv(m.otherName).includes(q);
        case 'email':            return fv(m.email).includes(q);
        case 'phone':            return fv(m.phone).includes(q);
        case 'address':          return fv(m.address).includes(q);
        case 'zone':             return fv(zoneName).includes(q);
        case 'role':             return fv(m.role).includes(q);
        case 'status':           return fv(m.status).includes(q);
        case 'exMemberReason':   return fv(m.exMemberReason).includes(q);
        case 'gender':           return fv(m.gender).includes(q);
        case 'age': {
          const age = calculateAge(m.dob);
          return age !== null && age.toString().includes(q);
        }
        case 'employmentStatus':   return fv(parseOccupation(m.occupation).status).includes(q);
        case 'employmentRole':     return fv(parseOccupation(m.occupation).role).includes(q);
        case 'employmentOrg':      return fv(parseOccupation(m.occupation).organization).includes(q);
        case 'employmentLocation': return fv(parseOccupation(m.occupation).location).includes(q);
        case 'maritalStatus':    return fv(m.maritalStatus).includes(q);
        case 'discoverySource':  return fv(m.discoverySource).includes(q);
        case 'emergencyContact': return fv(m.emergencyContact).includes(q);
        case 'emergencyPhone':   return fv(m.emergencyPhone).includes(q);
        case 'spouseName':       return fv(m.spouseName).includes(q);
        case 'motherName':       return fv(m.motherName).includes(q);
        case 'fatherName':       return fv(m.fatherName).includes(q);
        case 'isBaptized':       return fv(m.isBaptized ? 'yes' : 'no').includes(q);
        default: // 'all'
          const occ = parseOccupation(m.occupation);
          return (
            fv(m.firstName).includes(q) ||
            fv(m.lastName).includes(q) ||
            fv(m.otherName).includes(q) ||
            fv(m.email).includes(q) ||
            fv(m.phone).includes(q) ||
            fv(occ.status).includes(q) ||
            fv(occ.role).includes(q) ||
            fv(occ.organization).includes(q) ||
            fv(occ.location).includes(q) ||
            fv(m.role).includes(q) ||
            fv(m.emergencyContact).includes(q) ||
            fv(zoneName).includes(q) ||
            fv(m.exMemberReason).includes(q) ||
            (calculateAge(m.dob) !== null && calculateAge(m.dob)?.toString().includes(q))
          );
      }
    });
  }, [allMembers, membershipSearchField, membershipSearchQuery, zones]);

  const handlePrint = () => {
    if (!selectedMember || !memberAnalytics) return;
    
    const printWindow = window.open('', '', 'width=900,height=800');
    if (!printWindow) return;

    const reportDate = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const logoHtml = churchLogo 
      ? `<img src="${churchLogo}" style="height: 60px; object-fit: contain; margin-bottom: 15px;" />` 
      : `<div style="height: 60px; width: 60px; background: #e2e8f0; border-radius: 8px; margin-bottom: 15px;"></div>`;
      
    printWindow.document.write(`
      <html>
      <head>
          <title>Member Report - ${selectedMember.firstName} ${selectedMember.lastName}</title>
          <style>
              body { font-family: system-ui, sans-serif; padding: 40px; color: #0f172a; }
              .header-brand { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
              .header-brand h1 { margin: 0; font-size: 1.5rem; color: #334155; }
              .profile-section { display: flex; gap: 30px; margin-bottom: 40px; align-items: center; }
              .avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #f1f5f9; }
              .profile-details h2 { margin: 0 0 5px 0; font-size: 2rem; }
              .profile-meta { color: #64748b; font-size: 0.9rem; }
              .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
              .stat-box { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background: #f8fafc; }
              .stat-label { font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 8px; }
              .stat-value { font-size: 1.8rem; font-weight: 800; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.875rem; }
              th, td { border-bottom: 1px solid #e2e8f0; padding: 12px 16px; text-align: left; }
              th { background-color: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; color: #64748b; }
              .footer { margin-top: 50px; text-align: center; font-size: 0.75rem; color: #94a3b8; }
          </style>
      </head>
      <body>
          <div class="header-brand">
              ${logoHtml}
              <h1>${churchName}</h1>
              <div style="color: #64748b; margin-top: 5px;">Member Activity & Attendance Report</div>
              <div style="font-size: 0.8rem; margin-top: 5px;">Generated: ${reportDate}</div>
          </div>
          
          <div class="profile-section">
              <img class="avatar" src="${selectedMember.avatarUrl || `https://ui-avatars.com/api/?name=${selectedMember.firstName}+${selectedMember.lastName}&background=f1f5f9&color=64748b`}" />
              <div class="profile-details">
                  <h2>${selectedMember.titles?.join(' ') || ''} ${selectedMember.firstName} ${selectedMember.lastName}</h2>
                  <div class="profile-meta">
                      ${selectedMember.role} • ${selectedMember.status} • Joined ${selectedMember.joinDate ? new Date(selectedMember.joinDate).toLocaleDateString() : 'Unknown'}
                      <br/>
                      ${selectedMember.phone || 'No phone'} • ${selectedMember.email || 'No email'}
                  </div>
              </div>
          </div>

          <div class="stats-grid">
              <div class="stat-box">
                  <div class="stat-label">Attendance Rate</div>
                  <div class="stat-value">${memberAnalytics.attendanceRate}%</div>
              </div>
              <div class="stat-box">
                  <div class="stat-label">Total Attended</div>
                  <div class="stat-value">${memberAnalytics.totalAttended}</div>
              </div>
              <div class="stat-box">
                  <div class="stat-label">Total Possible</div>
                  <div class="stat-value">${memberAnalytics.totalPossible}</div>
              </div>
              <div class="stat-box">
                  <div class="stat-label">Baptized</div>
                  <div class="stat-value" style="font-size: 1.2rem; margin-top: 8px;">${selectedMember.isBaptized ? 'Yes' : 'No'}</div>
              </div>
          </div>

          <h3 style="margin-bottom: 10px; color: #334155;">Attendance History (Recent)</h3>
          <table>
              <thead>
                  <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th>Type</th>
                      <th>Check-in Time</th>
                      <th>Status</th>
                  </tr>
              </thead>
              <tbody>
                  ${memberHistory.slice(0, 50).map(item => `
                      <tr>
                          <td>${new Date(item.date).toLocaleDateString()}</td>
                          <td style="font-weight: 600;">${item.eventName}</td>
                          <td>${item.eventType}</td>
                          <td>${new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>${item.status}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>

          <div class="footer">
              Official church record • Confidential
          </div>
          <script>
            window.onload = () => { window.print(); }
          </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportCsv = () => {
    if (!selectedMember || memberHistory.length === 0) return;
    
    let csvContent = 'Date,Event Name,Event Type,Check-in Time,Status\n';
    
    for (const item of memberHistory) {
      const date = new Date(item.date).toLocaleDateString();
      const time = new Date(item.checkedInAt).toLocaleTimeString();
      csvContent += `"${date}","${item.eventName}","${item.eventType}","${time}","${item.status}"\n`;
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Attendance_History_${selectedMember.firstName}_${selectedMember.lastName}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMembershipCsv = () => {
    if (membershipSelectedIds.size === 0) return;
    const selectedMembers = filteredMembershipList.filter(m => membershipSelectedIds.has(m.id));
    
    const activeColumns = MEMBERSHIP_COLUMNS.filter(c => visibleColumns.has(c.id));
    let csvContent = activeColumns.map(c => c.label).join(',') + '\n';
    
    const getColVal = (m: typeof selectedMembers[0], colId: string) => {
      switch (colId) {
        case 'firstName':        return m.firstName || '';
        case 'lastName':         return m.lastName || '';
        case 'otherName':        return m.otherName || '';
        case 'email':            return m.email || '';
        case 'phone':            return m.phone || '';
        case 'address':          return m.address || '';
        case 'zone':             return zones.find(z => z.id === m.zoneId)?.name || 'Unassigned';
        case 'role':             return m.role || '';
        case 'status':           return m.status || '';
        case 'gender':           return m.gender || '';
        case 'dob':              return m.dob ? new Date(m.dob).toLocaleDateString() : '';
        case 'maritalStatus':    return m.maritalStatus || '';
        case 'employmentStatus':   return parseOccupation(m.occupation).status;
        case 'employmentRole':     return parseOccupation(m.occupation).role || '';
        case 'employmentOrg':      return parseOccupation(m.occupation).organization || '';
        case 'employmentLocation': return parseOccupation(m.occupation).location || '';
        case 'joinDate':         return m.joinDate ? new Date(m.joinDate).toLocaleDateString() : '';
        case 'discoverySource':  return m.discoverySource || '';
        case 'emergencyContact': return m.emergencyContact || '';
        case 'emergencyPhone':   return m.emergencyPhone || '';
        case 'isBaptized':       return m.isBaptized ? 'Yes' : 'No';
        case 'baptismDate':      return m.baptismDate ? new Date(m.baptismDate).toLocaleDateString() : '';
        case 'baptizedBy':       return m.baptizedBy || '';
        case 'spouseName':       return m.spouseName || '';
        case 'spousePhone':      return m.spousePhone || '';
        case 'motherName':       return m.motherName || '';
        case 'fatherName':       return m.fatherName || '';
        default:                 return '';
      }
    };

    for (const m of selectedMembers) {
      csvContent += activeColumns.map(col => `"${getColVal(m, col.id)}"`).join(',') + '\n';
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Membership_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintMembership = () => {
    if (membershipSelectedIds.size === 0) return;
    const selectedMembers = filteredMembershipList.filter(m => membershipSelectedIds.has(m.id));
    const activeColumns = MEMBERSHIP_COLUMNS.filter(c => visibleColumns.has(c.id));
    
    const printWindow = window.open('', '', 'width=900,height=800');
    if (!printWindow) return;

    const getColVal = (m: typeof selectedMembers[0], colId: string) => {
      switch (colId) {
        case 'firstName':        return m.firstName || '';
        case 'lastName':         return m.lastName || '';
        case 'otherName':        return m.otherName || '';
        case 'email':            return m.email || '-';
        case 'phone':            return m.phone || '-';
        case 'address':          return m.address || '-';
        case 'zone':             return zones.find(z => z.id === m.zoneId)?.name || 'Unassigned';
        case 'role':             return m.role || '';
        case 'status':           return m.status || '';
        case 'gender':           return m.gender || '-';
        case 'dob':              return m.dob ? new Date(m.dob).toLocaleDateString() : '-';
        case 'maritalStatus':    return m.maritalStatus || '-';
        case 'employmentStatus':   return parseOccupation(m.occupation).status;
        case 'employmentRole':     return parseOccupation(m.occupation).role || '-';
        case 'employmentOrg':      return parseOccupation(m.occupation).organization || '-';
        case 'employmentLocation': return parseOccupation(m.occupation).location || '-';
        case 'joinDate':         return m.joinDate ? new Date(m.joinDate).toLocaleDateString() : '-';
        case 'discoverySource':  return m.discoverySource || '-';
        case 'emergencyContact': return m.emergencyContact || '-';
        case 'emergencyPhone':   return m.emergencyPhone || '-';
        case 'isBaptized':       return m.isBaptized ? 'Yes' : 'No';
        case 'baptismDate':      return m.baptismDate ? new Date(m.baptismDate).toLocaleDateString() : '-';
        case 'baptizedBy':       return m.baptizedBy || '-';
        case 'spouseName':       return m.spouseName || '-';
        case 'spousePhone':      return m.spousePhone || '-';
        case 'motherName':       return m.motherName || '-';
        case 'fatherName':       return m.fatherName || '-';
        default:                 return '-';
      }
    };

    const reportDate = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    printWindow.document.write(`
      <html>
      <head>
          <title>Membership Report</title>
          <style>
              body { font-family: system-ui, sans-serif; padding: 40px; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.875rem; }
              th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
              th { background-color: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 0.7rem; color: #64748b; }
          </style>
      </head>
      <body>
          <h2>${churchName} - Membership Report</h2>
          <p>Generated: ${reportDate} | Total Selected: ${selectedMembers.length}</p>
          <table>
              <thead><tr>${activeColumns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
              <tbody>
                  ${selectedMembers.map(m => `
                      <tr>${activeColumns.map(col => `<td>${getColVal(m, col.id)}</td>`).join('')}</tr>
                  `).join('')}
              </tbody>
          </table>
          <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const tabs = [
    { id: 'overview', label: 'Overview Dashboard', icon: BarChart3 },
    { id: 'member', label: 'Member Report Card', icon: UserCheck },
    { id: 'event', label: 'Event Report Card', icon: Calendar },
    { id: 'membership', label: 'Membership List', icon: Users },
  ] as const;

  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <FileBarChart className="text-indigo-600 dark:text-indigo-400" size={32} />
            Advanced Reports
          </h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400">
            Analytics, demographics, and detailed member reports.
          </p>
        </div>
        
        {/* Tab Navigation - Desktop */}
        <div className="hidden lg:flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'overview' 
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Overview Dashboard
          </button>
          <button
            onClick={() => setActiveTab('member')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'member' 
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Member Report Card
          </button>
          <button
            onClick={() => setActiveTab('event')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'event' 
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Event Report Card
          </button>
          <button
            onClick={() => setActiveTab('membership')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'membership' 
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Membership List
          </button>
        </div>

        {/* Tab Navigation - Mobile Dropdown */}
        <div className="block lg:hidden w-full relative z-30">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full h-[54px] px-5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-white flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <activeTabData.icon size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>{activeTabData.label}</span>
            </div>
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isMobileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-enter">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-left font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <tab.icon size={18} className={activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Overview Stats */}
          {loadingOverview ? (
            <div className="h-32 flex items-center justify-center text-slate-400">Loading overview...</div>
          ) : overviewStats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Users size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Active Members</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{overviewStats.totalActiveMembers}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center dark:bg-emerald-500/10 dark:text-emerald-400">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Avg Attendance</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{overviewStats.avgAttendancePercentage}%</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center dark:bg-amber-500/10 dark:text-amber-400">
                  <Calendar size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Completed Events</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{overviewStats.totalCompletedEvents}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center dark:bg-blue-500/10 dark:text-blue-400">
                  <UserCheck size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Total Check-ins</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{overviewStats.totalCheckins}</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Zone Health Leaderboard */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HeartPulse className="text-rose-500" size={20} /> Zone Engagement Leaderboard
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Zone</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Members</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Active Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {zoneHealth.map((zone, idx) => (
                      <tr key={zone.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                          {idx === 0 && '🥇 '}
                          {idx === 1 && '🥈 '}
                          {idx === 2 && '🥉 '}
                          {zone.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{zone.totalMembers}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-700">
                              <div 
                                className={`h-full rounded-full ${zone.engagementRate > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${Math.min(zone.engagementRate, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{zone.engagementRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {zoneHealth.length === 0 && !loadingOverview && (
                      <tr><td colSpan={3} className="p-6 text-center text-slate-400">No zone data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Demographics */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="text-indigo-500" size={20} /> Attendance by Age Group
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-5">
                  {demographics.map((demo) => (
                    <div key={demo.ageGroup} className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{demo.ageGroup} ({demo.totalMembers} members)</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{demo.engagementRate}% active</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all" 
                          style={{ width: `${Math.min(demo.engagementRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {demographics.length === 0 && !loadingOverview && (
                    <div className="text-center text-slate-400 py-4">No demographic data available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'member' && (
        <div className="space-y-6 animate-fade-in">
          {/* Member Search */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 relative z-20">
            <label className="block text-sm font-bold text-slate-800 mb-2 dark:text-slate-200">Search Member Profile</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type member name or phone..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              
              {/* Dropdown Results */}
              {searchQuery && filteredMembers.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                  {filteredMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0 dark:hover:bg-slate-700/50 dark:border-slate-700/50"
                    >
                      <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random`} className="w-10 h-10 rounded-full object-cover" alt="" />
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{member.firstName} {member.lastName}</div>
                        <div className="text-xs text-slate-500">{member.role} • {member.phone || 'No phone'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Member Profile & Analytics Card */}
          {selectedMember && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
              {/* Header Actions */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center dark:border-slate-800 dark:bg-slate-800/20">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Report Card</div>
                <div className="flex gap-2">
                  <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                    <Download size={14} /> Export CSV
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
                    <Printer size={14} /> Print Profile
                  </button>
                </div>
              </div>

              {/* Profile Overview */}
              <div className="p-6 lg:p-8 flex flex-col md:flex-row gap-8 items-start border-b border-slate-100 dark:border-slate-800">
                <img 
                  src={selectedMember.avatarUrl || `https://ui-avatars.com/api/?name=${selectedMember.firstName}+${selectedMember.lastName}&background=random`} 
                  className="w-32 h-32 rounded-3xl object-cover shadow-lg shadow-slate-200/50 dark:shadow-black/20"
                  alt=""
                />
                <div className="flex-1">
                  <h2 className="text-3xl font-black text-slate-900 mb-2 dark:text-white">
                    {selectedMember.titles?.join(' ') || ''} {selectedMember.firstName} {selectedMember.lastName}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selectedMember.role}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedMember.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                      {selectedMember.status}
                    </span>
                    {selectedMember.isBaptized && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 flex items-center gap-1 dark:bg-blue-500/10 dark:text-blue-400">
                        <CheckCircle2 size={12} /> Baptized
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400 mb-0.5">Zone</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {zones.find(z => z.id === selectedMember.zoneId)?.name || 'Unassigned'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Phone</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedMember.phone || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Email</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={selectedMember.email}>{selectedMember.email || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Joined</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedMember.joinDate ? new Date(selectedMember.joinDate).toLocaleDateString() : '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Marital Status</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedMember.maritalStatus || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Section */}
              {loadingMemberData ? (
                <div className="p-10 text-center text-slate-400">Loading analytics...</div>
              ) : memberAnalytics ? (
                <div className="p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 dark:text-white">Attendance Analytics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Rate Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 flex flex-col justify-center items-center text-center">
                      <div className="relative inline-flex items-center justify-center mb-4">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                          <circle 
                            cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" 
                            className={`${memberAnalytics.attendanceRate > 75 ? 'text-emerald-500' : memberAnalytics.attendanceRate > 40 ? 'text-amber-500' : 'text-rose-500'}`}
                            strokeDasharray="251.2" 
                            strokeDashoffset={251.2 - (251.2 * (memberAnalytics.attendanceRate || 0)) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-2xl font-black text-slate-800 dark:text-white">{memberAnalytics.attendanceRate}%</span>
                      </div>
                      <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Overall Attendance Rate</div>
                      <div className="text-xs text-slate-400 mt-1">{memberAnalytics.totalAttended} of {memberAnalytics.totalPossible} events attended</div>
                    </div>

                    {/* Breakdown by Type */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                      <div className="text-sm font-bold text-slate-500 mb-4 dark:text-slate-400">By Event Type</div>
                      <div className="space-y-4">
                        {memberAnalytics.byEventType?.map((et) => (
                          <div key={et.type}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{et.type}</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{et.count}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-700">
                              <div 
                                className="h-full bg-indigo-500 rounded-full" 
                                style={{ width: `${Math.min((et.count / (memberAnalytics.totalAttended || 1)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {(!memberAnalytics.byEventType || memberAnalytics.byEventType.length === 0) && (
                          <div className="text-center text-xs text-slate-400 py-4">No specific event types found.</div>
                        )}
                      </div>
                    </div>

                    {/* Simple Trend */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 md:col-span-1">
                      <div className="text-sm font-bold text-slate-500 mb-4 dark:text-slate-400">Recent Monthly Trend</div>
                      <div className="h-[180px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={memberAnalytics.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="memberTrendGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                padding: '10px 14px',
                              }}
                              labelStyle={{ color: theme === 'dark' ? '#fff' : '#0f172a', fontWeight: 700 }}
                              itemStyle={{ color: '#ec4899', fontWeight: 700 }}
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke="#ec4899"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#memberTrendGrad)"
                              dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: theme === 'dark' ? '#1e293b' : '#fff' }}
                              activeDot={{ r: 6, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }}
                              animationDuration={1500}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                </div>
              ) : null}

              {/* Detailed History Table */}
              {memberHistory.length > 0 && (
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Event</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {memberHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                            {item.eventName}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold dark:bg-slate-800">{item.eventType}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 font-mono dark:text-slate-400">
                            {new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'event' && (
        <div className="space-y-6 animate-fade-in">
          {/* Event & Instance Selection */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 relative z-20 flex flex-col items-center justify-center py-12">
             <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 dark:bg-indigo-500/10 dark:text-indigo-400">
               <Calendar size={32} />
             </div>
             <h2 className="text-xl font-bold text-slate-800 mb-2 dark:text-white">Generate Event Report</h2>
             <p className="text-slate-500 text-center max-w-md mb-6 dark:text-slate-400">
               Select an event and a specific date to view detailed attendance analytics and history for that session.
             </p>
             <button
               onClick={() => setIsSessionPickerOpen(true)}
               className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-600/20"
             >
               {selectedReportEventId && selectedReportInstanceId ? 'Change Event / Date' : 'Select Event & Date'}
             </button>
          </div>

          {/* Event Report Body */}
          {selectedReportEventId && selectedReportInstanceId && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-fade-in">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 dark:border-slate-800 dark:bg-slate-800/20">
                <div>
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1 dark:text-indigo-400">Event Attendance Report</div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {events.find(e => e.id === selectedReportEventId)?.name}
                  </h3>
                  <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {(() => {
                      const inst = reportInstances.find(i => i.id === selectedReportInstanceId);
                      return inst ? new Date(inst.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
                    })()}
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <button 
                    onClick={() => setEventReportSubTab('all')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${eventReportSubTab === 'all' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setEventReportSubTab('present')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${eventReportSubTab === 'present' ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    Present
                  </button>
                  <button 
                    onClick={() => setEventReportSubTab('absent')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${eventReportSubTab === 'absent' ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    Absent
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 dark:border-slate-800">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Showing {filteredEventAttendance.length} Members
                </div>
              </div>

              {loadingEventAttendance ? (
                <div className="p-10 text-center text-slate-400">Loading attendance...</div>
              ) : (
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Member Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Zone</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check-in Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredEventAttendance.map((record) => {
                        const memberFull = (allMembers.length > 0 ? allMembers : members).find(m => m.id === record.memberId);
                        const zoneName = memberFull?.zoneId ? zones.find(z => z.id === memberFull.zoneId)?.name : 'Unassigned';
                        return (
                          <tr 
                            key={record.id} 
                            onClick={() => {
                              if (memberFull) setViewedEventMember(memberFull);
                            }}
                            className="hover:bg-slate-50 cursor-pointer dark:hover:bg-slate-800/50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={record.avatarUrl || `https://ui-avatars.com/api/?name=${record.firstName}+${record.lastName}&background=random`} 
                                  className="w-8 h-8 rounded-full object-cover" 
                                  alt="" 
                                />
                                <div className="font-bold text-slate-800 dark:text-white">
                                  {record.firstName} {record.lastName}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 px-2 py-1 rounded-md dark:bg-slate-800">{zoneName}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${record.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 font-mono dark:text-slate-400">
                              {record.checkedInAt ? new Date(record.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {record.phone || record.email || '-'}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEventAttendance.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <Search size={32} className="opacity-20" />
                              <p>No members found matching your search or filter.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'membership' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 relative z-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Membership Directory Report</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Filter and select members for export and printing.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExportMembershipCsv} disabled={membershipSelectedIds.size === 0} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                  <Download size={16} /> Export CSV
                </button>
                <button onClick={handlePrintMembership} disabled={membershipSelectedIds.size === 0} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20">
                  <Printer size={16} /> Print Selected
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <CustomSelect
                value={membershipSearchField}
                onChange={(val) => setMembershipSearchField(val)}
                options={searchFieldOptions}
                fullWidth={false}
                className="w-full sm:w-60"
              />
              <button
                onClick={() => setShowColumnDropdown(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 shrink-0"
              >
                <Columns size={16} /> Columns
                {visibleColumns.size < MEMBERSHIP_COLUMNS.length && (
                  <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black dark:bg-indigo-500/20 dark:text-indigo-300">
                    {visibleColumns.size}/{MEMBERSHIP_COLUMNS.length}
                  </span>
                )}
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={membershipSearchQuery}
                  onChange={(e) => setMembershipSearchQuery(e.target.value)}
                  placeholder="Type to filter..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            {/* Column Picker Modal */}
            {showColumnDropdown && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowColumnDropdown(false)}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div
                  className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-white">Visible Columns</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{visibleColumns.size} of {MEMBERSHIP_COLUMNS.length} selected</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setVisibleColumns(new Set(MEMBERSHIP_COLUMNS.map(c => c.id)))} className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400">All</button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button onClick={() => setVisibleColumns(new Set())} className="text-xs font-bold text-slate-500 hover:underline dark:text-slate-400">None</button>
                      <button onClick={() => setShowColumnDropdown(false)} className="ml-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors dark:hover:bg-slate-800">
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {[
                      { label: 'Identity',   cols: ['firstName','lastName','otherName','gender','dob','maritalStatus'] },
                      { label: 'Contact',    cols: ['email','phone','address'] },
                      { label: 'Church',     cols: ['zone','role','status','exMemberReason','joinDate','discoverySource'] },
                      { label: 'Employment', cols: ['employmentStatus', 'employmentRole', 'employmentOrg', 'employmentLocation'] },
                      { label: 'Emergency',  cols: ['emergencyContact','emergencyPhone'] },
                      { label: 'Family',     cols: ['spouseName','spousePhone','motherName','fatherName'] },
                      { label: 'Baptism',    cols: ['isBaptized','baptismDate','baptizedBy'] },
                    ].map(group => (
                      <div key={group.label}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 dark:text-slate-500">{group.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.cols.map(colId => {
                            const col = MEMBERSHIP_COLUMNS.find(c => c.id === colId);
                            if (!col) return null;
                            const isOn = visibleColumns.has(colId);
                            return (
                              <button
                                key={colId}
                                type="button"
                                onClick={() => {
                                  const next = new Set(visibleColumns);
                                  if (next.has(colId)) next.delete(colId);
                                  else next.add(colId);
                                  setVisibleColumns(next);
                                }}
                                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                                  isOn
                                    ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300'
                                }`}
                              >
                                {col.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setShowColumnDropdown(false)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Showing {filteredMembershipList.length} Members | {membershipSelectedIds.size} Selected
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl dark:border-slate-800">
              <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                <thead className="bg-slate-50 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-4 py-3 w-4">
                      <button 
                        onClick={() => {
                          if (membershipSelectedIds.size === filteredMembershipList.length && filteredMembershipList.length > 0) {
                            setMembershipSelectedIds(new Set());
                          } else {
                            setMembershipSelectedIds(new Set(filteredMembershipList.map(m => m.id)));
                          }
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {filteredMembershipList.length > 0 && membershipSelectedIds.size === filteredMembershipList.length ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                      </button>
                    </th>
                    {MEMBERSHIP_COLUMNS.filter(c => visibleColumns.has(c.id)).map(col => (
                      <th key={col.id} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMembershipList.map(member => (
                    <tr 
                      key={member.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${membershipSelectedIds.has(member.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                      onClick={() => {
                        const newSet = new Set(membershipSelectedIds);
                        if (newSet.has(member.id)) newSet.delete(member.id);
                        else newSet.add(member.id);
                        setMembershipSelectedIds(newSet);
                      }}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            const newSet = new Set(membershipSelectedIds);
                            if (newSet.has(member.id)) newSet.delete(member.id);
                            else newSet.add(member.id);
                            setMembershipSelectedIds(newSet);
                          }}
                          className="text-slate-300 hover:text-indigo-600 transition-colors"
                        >
                          {membershipSelectedIds.has(member.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                        </button>
                      </td>
                      {visibleColumns.has('firstName') && (
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                          <div className="flex items-center gap-3">
                            <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random`} className="w-8 h-8 rounded-full object-cover" alt="" />
                            {member.firstName}
                          </div>
                        </td>
                      )}
                      {visibleColumns.has('lastName') && (<td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{member.lastName}</td>)}
                      {visibleColumns.has('otherName') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.otherName || '-'}</td>)}
                      {visibleColumns.has('email') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.email || '-'}</td>)}
                      {visibleColumns.has('phone') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.phone || '-'}</td>)}
                      {visibleColumns.has('address') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-[160px] truncate">{member.address || '-'}</td>)}
                      {visibleColumns.has('zone') && (<td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{zones.find(z => z.id === member.zoneId)?.name || 'Unassigned'}</td>)}
                      {visibleColumns.has('role') && (<td className="px-4 py-3 text-xs text-slate-500">{member.role || 'Member'}</td>)}
                      {visibleColumns.has('status') && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : member.status === 'Visitor' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {member.status}
                          </span>
                        </td>
                      )}
                            {visibleColumns.has('gender') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.gender || '-'}</td>)}
                            {visibleColumns.has('exMemberReason') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.exMemberReason || '-'}</td>)}
                      {visibleColumns.has('dob') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.dob ? new Date(member.dob).toLocaleDateString() : '-'}</td>)}
                      {visibleColumns.has('maritalStatus') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.maritalStatus || '-'}</td>)}
                      {visibleColumns.has('employmentStatus') && (
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            parseOccupation(member.occupation).status === 'Employed' 
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' 
                              : parseOccupation(member.occupation).status === 'Student' 
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' 
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {parseOccupation(member.occupation).status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.has('employmentRole') && (
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {parseOccupation(member.occupation).role || '-'}
                        </td>
                      )}
                      {visibleColumns.has('employmentOrg') && (
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {parseOccupation(member.occupation).organization || '-'}
                        </td>
                      )}
                      {visibleColumns.has('employmentLocation') && (
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {parseOccupation(member.occupation).location || '-'}
                        </td>
                      )}
                      {visibleColumns.has('joinDate') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '-'}</td>)}
                      {visibleColumns.has('discoverySource') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.discoverySource || '-'}</td>)}
                      {visibleColumns.has('emergencyContact') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.emergencyContact || '-'}</td>)}
                      {visibleColumns.has('emergencyPhone') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.emergencyPhone || '-'}</td>)}
                      {visibleColumns.has('isBaptized') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.isBaptized ? 'Yes' : 'No'}</td>)}
                      {visibleColumns.has('baptismDate') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.baptismDate ? new Date(member.baptismDate).toLocaleDateString() : '-'}</td>)}
                      {visibleColumns.has('baptizedBy') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.baptizedBy || '-'}</td>)}
                      {visibleColumns.has('spouseName') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.spouseName || '-'}</td>)}
                      {visibleColumns.has('spousePhone') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.spousePhone || '-'}</td>)}
                      {visibleColumns.has('motherName') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.motherName || '-'}</td>)}
                      {visibleColumns.has('fatherName') && (<td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.fatherName || '-'}</td>)}
                    </tr>
                  ))}
                  {filteredMembershipList.length === 0 && (
                    <tr>
                      <td colSpan={1 + MEMBERSHIP_COLUMNS.filter(c => visibleColumns.has(c.id)).length} className="p-10 text-center text-slate-400">No members found matching your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <ReportSessionPickerModal
        isOpen={isSessionPickerOpen}
        onClose={() => setIsSessionPickerOpen(false)}
        events={events}
        fetchInstances={fetchInstances}
        onSelect={(eventId, instanceId) => {
          setSelectedReportEventId(eventId);
          setSelectedReportInstanceId(instanceId);
        }}
      />
      <ViewMemberModal
        isOpen={!!viewedEventMember}
        onClose={() => setViewedEventMember(null)}
        member={viewedEventMember}
        zones={zones}
        onOpenIdCard={(m) => {
          // No-op for now, Reports doesn't need to generate ID card, but we could hook it up later.
        }}
      />
    </div>
  );
};

export default Reports;
