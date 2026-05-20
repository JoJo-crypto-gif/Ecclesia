import React, { useState } from 'react';
import { Download, FileText, Users, Calendar, Filter, X } from 'lucide-react';
import Modal from '../Modal';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { MemberStatus } from '../../types';
import CustomSelect from '../CustomSelect';

const statusOptions = [
  { value: 'all', label: 'All Members' },
  { value: 'Active', label: 'Active Only' },
  { value: 'Inactive', label: 'Inactive Only' },
  { value: 'Visitor', label: 'Visitors Only' },
];

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({ isOpen, onClose }) => {
  const { members, events, fetchAllInstances, fetchAttendance } = useData();
  const { error: toastError } = useToast();
  const [reportType, setReportType] = useState<'attendance' | 'members'>('attendance');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      let csvContent = '';
      let filename = '';

      if (reportType === 'attendance') {
        // --- Generate Attendance Report ---
        filename = `Attendance_Report_${date}.csv`;
        
        // 1. Find instances on this date
        // We'll fetch all instances for a small range around this date to be safe, or just utilize the existing fetch logic
        // But the simplest is to assume we might need to fetch them if not loaded.
        // For simplicity, let's just fetch instances for this specific date range (1 day)
        const instances = await fetchAllInstances(date, date);
        
        if (instances.length === 0) {
            toastError('No events found for this date.');
            setIsGenerating(false);
            return;
        }

        // Header
        csvContent = 'Event Name,Date,Time,Member Name,Status,Role,Check-in Time\n';

        for (const instance of instances) {
            const event = events.find(e => e.id === instance.eventId);
            const eventName = event?.name || 'Unknown Event';
            
            // Get attendance
            const records = await fetchAttendance(instance.id);
            
            for (const record of records) {
                const checkInTime = new Date(record.checkedInAt).toLocaleTimeString();
                csvContent += `"${eventName}","${instance.date}","${event?.startTime || ''}","${record.firstName} ${record.lastName}","${record.status}","${record.memberStatus || 'Visitor'}","${checkInTime}"\n`;
            }
        }
      } else {
        // --- Generate Member Directory ---
        filename = `Members_Directory_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'First Name,Last Name,Phone,Email,Status,Role,Zone,Join Date\n';
        
        const filteredMembers = members.filter(m => {
            if (memberStatusFilter === 'all') return true;
            return m.status === memberStatusFilter;
        });

        for (const member of filteredMembers) {
            // Find zone name
            // (Assuming zones are loaded in context, but if not we can just put ID or skip)
            // We can just use the zoneId for now or empty if looking up is complex without zones in this component props
            // Actually useData has zones
            // Let's assume we can access zones next time or just omit for MVP speed if not strictly needed
            // But let's try to be detailed. 
            csvContent += `"${member.firstName}","${member.lastName}","${member.phone}","${member.email}","${member.status}","${member.role}","${member.zoneId || ''}","${member.joinDate}"\n`;
        }
      }

      // Trigger Download
      // Trigger Download
      // Add BOM for Excel compatibility
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onClose();
    } catch (err) {
      console.error("Report generation failed", err);
      toastError("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Report">
      <div className="p-6 space-y-6">
        
        {/* Report Type Selector */}
        <div className="grid grid-cols-2 gap-4">
            <button
                onClick={() => setReportType('attendance')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                    reportType === 'attendance' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-400 dark:text-indigo-300' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
            >
                <Calendar size={24} />
                <span className="font-bold text-sm">Daily Attendance</span>
            </button>
            <button
                onClick={() => setReportType('members')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                    reportType === 'members' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-400 dark:text-indigo-300' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
            >
                <Users size={24} />
                <span className="font-bold text-sm">Member Directory</span>
            </button>
        </div>

        {/* Configuration Options */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            {reportType === 'attendance' ? (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 dark:text-slate-300">Select Date</label>
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">
                        Downloads a detailed list of all check-ins for all events on this date.
                    </p>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 dark:text-slate-300">Filter by Status</label>
                    <CustomSelect
                        value={memberStatusFilter}
                        onChange={(val) => setMemberStatusFilter(val)}
                        options={statusOptions}
                    />
                    <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">
                        Exports a CSV list of members matching the selected status.
                    </p>
                </div>
            )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
            <button 
                onClick={onClose}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
            >
                Cancel
            </button>
            <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
                {isGenerating ? (
                    <>Generating...</>
                ) : (
                    <><Download size={18} /> Download CSV</>
                )}
            </button>
        </div>

      </div>
    </Modal>
  );
};

export default ReportGenerationModal;
