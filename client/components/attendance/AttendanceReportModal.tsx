import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Printer, UserCheck, UserX, Users, Search, CheckCircle2, XCircle 
} from 'lucide-react';
import Modal from '../Modal';
import { ChurchEvent, EventInstance, Member, AttendanceRecord } from '../../types';
import { apiFetch } from '../../utils/api';

interface AttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ChurchEvent | null;
  instance: EventInstance | null;
}

const AttendanceReportModal: React.FC<AttendanceReportModalProps> = ({ 
  isOpen, onClose, event, instance 
}) => {
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportTab, setReportTab] = useState<'present' | 'absent' | 'all'>('present');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [instances, setInstances] = useState<EventInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fetch all instances for the event when modal opens
  useEffect(() => {
    if (isOpen && event) {
      setReportSearchTerm('');
      setReportTab('present');
      
      // Fetch instances for this event
      apiFetch(`/api/events/${event.id}/instances`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setInstances(data.data);
            // Default to the current instance or the first one
            if (instance) {
              setSelectedInstanceId(instance.id);
            } else if (data.data.length > 0) {
              setSelectedInstanceId(data.data[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen, event, instance]);

  // Fetch attendance when selected instance changes
  useEffect(() => {
    if (selectedInstanceId) {
      setLoading(true);
      apiFetch(`/api/attendance/instance/${selectedInstanceId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAttendanceRecords(data.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedInstanceId]);

  // Fetch ALL members for the report
  const { fetchAllMembers } = useData();
  const [allMembers, setAllMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAllMembers().then(setAllMembers);
    }
  }, [isOpen, fetchAllMembers]);

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);
  const eligibleMembers = useMemo(() => {
    if (!event?.zoneId) return allMembers;
    return allMembers.filter(member => member.zoneId === event.zoneId);
  }, [allMembers, event?.zoneId]);

  // Build report data
  const currentReportData = useMemo(() => {
    if (!event || !selectedInstanceId) {
      return { items: [], stats: { present: 0, absent: 0, total: 0 } };
    }

    // Build a set of present member IDs from attendance records
    const presentMemberIds = new Set(
      attendanceRecords.map(r => r.memberId).filter(Boolean)
    );

    // Map all members (from full fetch) to a report item
    const allItems = eligibleMembers.map(member => {
      const record = attendanceRecords.find(r => r.memberId === member.id);
      return {
        member,
        record,
        isPresent: presentMemberIds.has(member.id),
        status: presentMemberIds.has(member.id) ? 'Present' : 'Absent',
        timestamp: record?.checkedInAt
      };
    });

    // Also add visitors (records without memberId)
    const visitorRecords = attendanceRecords.filter(r => !r.memberId && r.visitorName);
    const visitorItems = visitorRecords.map(r => ({
      member: {
        id: r.id,
        firstName: r.visitorName || 'Visitor',
        lastName: '',
        email: '',
        phone: '',
        status: 'Visitor' as any,
        joinDate: '',
        role: 'Visitor',
      } as Member,
      record: r,
      isPresent: true,
      status: 'Present',
      timestamp: r.checkedInAt
    }));

    const combinedItems = [...allItems, ...visitorItems];

    // Stats
    const stats = {
      total: eligibleMembers.length,
      present: allItems.filter(i => i.isPresent).length + visitorItems.length,
      absent: allItems.filter(i => !i.isPresent).length
    };

    // Filter by search
    let filteredItems = combinedItems.filter(item => {
      const searchLower = reportSearchTerm.toLowerCase();
      const fullName = `${item.member.firstName} ${item.member.lastName}`.toLowerCase();
      return fullName.includes(searchLower);
    });

    // Filter by tab
    if (reportTab === 'present') {
      filteredItems = filteredItems.filter(i => i.isPresent);
      filteredItems.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
    } else if (reportTab === 'absent') {
      filteredItems = filteredItems.filter(i => !i.isPresent);
      filteredItems.sort((a, b) => a.member.firstName.localeCompare(b.member.firstName));
    } else {
      filteredItems.sort((a, b) => {
        if (a.isPresent === b.isPresent) {
          return a.member.firstName.localeCompare(b.member.firstName);
        }
        return a.isPresent ? -1 : 1;
      });
    }

    return { items: filteredItems, stats };
  }, [event, selectedInstanceId, attendanceRecords, eligibleMembers, reportSearchTerm, reportTab]);

  const handlePrintReport = () => {
    if (!event || !selectedInstance) return;
    
    const reportDate = new Date(selectedInstance.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const printWindow = window.open('', '', 'width=900,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
            <title>Attendance Report - ${event.name}</title>
            <style>
                body { font-family: system-ui, sans-serif; padding: 40px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
                th { background-color: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .header { margin-bottom: 30px; }
                .stats { display: flex; gap: 20px; margin-bottom: 20px; }
                .stat-box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; min-width: 150px; }
                .stat-label { font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; }
                .stat-value { font-size: 1.5rem; font-weight: 800; color: #0f172a; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="font-size: 1.8rem; font-weight: bold; margin-bottom: 8px;">${event.name}</h1>
                <div style="color: #64748b;">Attendance Report for ${reportDate}</div>
                <div style="color: #94a3b8; font-size: 0.875rem; margin-top: 4px;">Filtered View: ${reportTab.charAt(0).toUpperCase() + reportTab.slice(1)}</div>
            </div>
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-label">Total Present</div>
                    <div class="stat-value">${currentReportData.stats.present}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Total Absent</div>
                    <div class="stat-value">${currentReportData.stats.absent}</div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Check-in Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentReportData.items.map(item => `
                        <tr>
                            <td style="font-weight: bold;">${item.member.firstName} ${item.member.lastName}</td>
                            <td>${item.member.role || '-'}</td>
                            <td>${item.isPresent ? 'Present' : 'Absent'}</td>
                            <td>${item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; text-align: center;">Generated by Ecclesia Manager on ${new Date().toLocaleString()}</div>
            <script>window.print();</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Attendance Report"
    maxWidth="max-w-4xl"
  >
     <div className="flex h-[70vh] flex-col md:flex-row overflow-hidden">
        {/* Sidebar with Instances */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col dark:bg-slate-900/50 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Select Session</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {instances.length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-4 italic">No sessions found.</div>
                ) : (
                    instances.map(inst => (
                        <button
                            key={inst.id}
                            onClick={() => setSelectedInstanceId(inst.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                selectedInstanceId === inst.id 
                                ? 'bg-white shadow-sm text-indigo-600 border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-600' 
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex justify-between items-center">
                                <span>{new Date(inst.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                {selectedInstanceId === inst.id && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                            </div>
                            {inst.attendanceCount !== undefined && inst.attendanceCount > 0 && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{inst.attendanceCount} check-ins</div>
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>

        {/* Main Report Content */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            {/* Header Stats */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex justify-between items-start mb-6">
                    <div>
                         <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{event?.name}</h2>
                         <p className="text-slate-500 dark:text-slate-400">
                            {selectedInstance 
                              ? new Date(selectedInstance.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
                              : 'Select a session'}
                         </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrintReport} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                            <Printer size={16} /> Print Report
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <UserCheck size={16} className="text-emerald-500" />
                            <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Present</div>
                        </div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{currentReportData.stats.present}</div>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <UserX size={16} className="text-rose-500" />
                            <div className="text-xs font-bold text-rose-500 uppercase tracking-wider">Absent</div>
                        </div>
                        <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{currentReportData.stats.absent}</div>
                    </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-1">
                            <Users size={16} className="text-slate-400" />
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Members</div>
                        </div>
                        <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{currentReportData.stats.total}</div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search member by name..."
                            value={reportSearchTerm}
                            onChange={(e) => setReportSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex-shrink-0">
                        <button 
                            onClick={() => setReportTab('present')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${reportTab === 'present' ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Present
                        </button>
                         <button 
                            onClick={() => setReportTab('absent')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${reportTab === 'absent' ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Absent
                        </button>
                        <button 
                            onClick={() => setReportTab('all')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${reportTab === 'all' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            All
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50" id="attendance-report-table">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <p>Loading...</p>
                    </div>
                ) : currentReportData.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p>No members found matching your criteria.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0 z-10 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Member</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Attendance Status</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Time</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Role & Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {currentReportData.items.map(({ member, isPresent, timestamp }) => (
                                <tr key={member.id} className="hover:bg-slate-50 transition-colors dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random`} 
                                                className={`w-8 h-8 rounded-full object-cover border-2 ${isPresent ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-100 dark:border-slate-700'}`}
                                                alt=""
                                            />
                                            <div>
                                                <div className={`font-semibold ${isPresent ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-500'}`}>{member.firstName} {member.lastName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        {isPresent ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                                <CheckCircle2 size={12} /> Present
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                                                <XCircle size={12} /> Absent
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-slate-500 font-mono dark:text-slate-400">
                                        {timestamp ? new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : <span className="text-slate-300 dark:text-slate-600">--:--</span>}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{member.role || 'Member'}</span>
                                            <span className="text-[10px] text-slate-400 uppercase">{member.status}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
     </div>
  </Modal>
  );
};

export default AttendanceReportModal;
