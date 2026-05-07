import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { FileBarChart, Users, Calendar, BarChart3, Search, UserCheck, ShieldAlert, HeartPulse, CheckCircle2, Download, Printer } from 'lucide-react';
import { Member } from '../types';
import Logo from '../components/Logo';
import ReportSessionPickerModal from '../components/attendance/ReportSessionPickerModal';
import ViewMemberModal from '../components/members/ViewMemberModal';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface ReportOverview {
  totalActiveMembers: number;
  totalCompletedEvents: number;
  totalCheckins: number;
  avgAttendancePercentage: number;
}

const Reports: React.FC<{ user: any }> = ({ user }) => {
  const { settings, members, fetchAllMembers, attendanceTrends, zones, events, fetchInstances, theme } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'member' | 'event'>('overview');
  const churchName = settings.church_name || 'Ecclesia';
  const churchLogo = settings.church_logo || '';

  // Dashboard state
  const [overviewStats, setOverviewStats] = useState<ReportOverview | null>(null);
  const [zoneHealth, setZoneHealth] = useState<any[]>([]);
  const [demographics, setDemographics] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Member Report state
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberAnalytics, setMemberAnalytics] = useState<any>(null);
  const [memberHistory, setMemberHistory] = useState<any[]>([]);
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

  // Fetch overview data
  useEffect(() => {
    if (activeTab === 'overview' && !overviewStats) {
      const fetchOverview = async () => {
        try {
          const [overviewRes, zoneRes, demoRes] = await Promise.all([
            fetch('/api/attendance/report-overview', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/attendance/zone-health', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/attendance/demographics', { credentials: 'include' }).then(r => r.json())
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
    if (activeTab === 'member' && allMembers.length === 0) {
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
            fetch(`/api/attendance/member/${selectedMember.id}/analytics`, { credentials: 'include' }).then(r => r.json()),
            fetch(`/api/attendance/member/${selectedMember.id}`, { credentials: 'include' }).then(r => r.json())
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
      fetch(`/api/attendance/instance/${selectedReportInstanceId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setEventAttendanceRecords(data.data);
          }
        })
        .finally(() => setLoadingEventAttendance(false));
    }
  }, [activeTab, selectedReportInstanceId]);

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
        
        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
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
                <table className="w-full text-left">
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
                        {memberAnalytics.byEventType?.map((et: any) => (
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
                  <table className="w-full text-left">
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

              {loadingEventAttendance ? (
                <div className="p-10 text-center text-slate-400">Loading attendance...</div>
              ) : (
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left">
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
                      {eventAttendanceRecords
                        .filter(r => eventReportSubTab === 'all' || r.status.toLowerCase() === eventReportSubTab)
                        .map((record) => {
                        const memberFull = members.find(m => m.id === record.memberId);
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
                      {eventAttendanceRecords.filter(r => eventReportSubTab === 'all' || r.status.toLowerCase() === eventReportSubTab).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">No records found for current filter.</td>
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
