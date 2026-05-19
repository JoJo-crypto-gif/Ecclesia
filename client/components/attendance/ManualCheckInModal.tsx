import React, { useState, useEffect } from 'react';
import { 
  Calendar, Search, Users, CheckCircle2, UserCheck 
} from 'lucide-react';
import Modal from '../Modal';
import { ChurchEvent, EventInstance, Member, AttendanceRecord } from '../../types';
import { useData } from '../../context/DataContext';
import { apiFetch } from '../../utils/api';

interface ManualCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ChurchEvent | null;
  instance: EventInstance | null;
  members: Member[];
  onToggleAttendance: (memberId: string, isPresent: boolean) => void;
}

const ManualCheckInModal: React.FC<ManualCheckInModalProps> = ({ 
  isOpen, onClose, event, instance, members, onToggleAttendance 
}) => {
  const { fetchAllMembers } = useData();
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch attendance for this instance when modal opens
  useEffect(() => {
    if (isOpen && instance) {
      setLoading(true);
      apiFetch(`/api/attendance/instance/${instance.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAttendanceRecords(data.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, instance]);

  useEffect(() => {
    if (isOpen) {
      fetchAllMembers()
        .then(setAllMembers)
        .catch(console.error);
    }
  }, [isOpen, fetchAllMembers]);

  // Refresh after toggle
  const handleToggle = async (memberId: string, isPresent: boolean) => {
    await onToggleAttendance(memberId, isPresent);
    // Refetch attendance
    if (instance) {
      const res = await apiFetch(`/api/attendance/instance/${instance.id}`);
      const data = await res.json();
      if (data.success) {
        setAttendanceRecords(data.data);
      }
    }
  };

  if (!event || !instance) return null;

  const presentMemberIds = new Set(attendanceRecords.map(r => r.memberId).filter(Boolean));
  const availableMembers = (allMembers.length > 0 ? allMembers : members).filter(member => (
    !event.zoneId || member.zoneId === event.zoneId
  ));
  
  let filteredMembers = availableMembers.filter(m => {
    const fullName = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const email = (m.email || '').toLowerCase();
    const search = (manualSearchTerm || '').toLowerCase();
    
    return fullName.includes(search) || email.includes(search);
  });

  const membersList = filteredMembers.map(m => ({
    member: m,
    isPresent: presentMemberIds.has(m.id)
  })).sort((a, b) => {
    if (a.isPresent === b.isPresent) {
      return a.member.firstName.localeCompare(b.member.firstName);
    }
    return a.isPresent ? -1 : 1;
  });

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Manual Check-In`}
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-col h-[70vh]">
            <div className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{event.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-1 dark:text-slate-400">
                             <Calendar size={14} />
                             <span>{new Date(instance.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {attendanceRecords.length}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checked In</div>
                     </div>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by name or email to check in..." 
                        value={manualSearchTerm}
                        onChange={(e) => setManualSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        autoFocus
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/50">
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading...</div>
                ) : membersList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Users size={48} className="mx-auto mb-2 opacity-20" />
                        <p>No members found.</p>
                    </div>
                ) : (
                    membersList.map(({ member, isPresent }) => (
                        <div 
                            key={member.id} 
                            className={`flex items-center justify-between p-3 rounded-xl transition-all border ${
                                isPresent 
                                ? 'bg-white border-indigo-100 shadow-sm dark:bg-slate-800 dark:border-indigo-900/30' 
                                : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <img 
                                        src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random`} 
                                        className={`w-10 h-10 rounded-full object-cover border-2 ${isPresent ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700'}`}
                                        alt=""
                                    />
                                    {isPresent && (
                                        <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800">
                                            <CheckCircle2 size={10} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className={`font-bold ${isPresent ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {member.firstName} {member.lastName}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-500">
                                        {member.role || 'Member'} • {member.email}
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => handleToggle(member.id, isPresent)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                    isPresent 
                                    ? 'bg-indigo-50 text-indigo-700 hover:bg-red-50 hover:text-red-600 hover:shadow-none dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-red-900/30 dark:hover:text-red-400' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400'
                                }`}
                            >
                                {isPresent ? (
                                    <>Checked In <CheckCircle2 size={16} /></>
                                ) : (
                                    <>Check In <UserCheck size={16} /></>
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
      </Modal>
  );
};

export default ManualCheckInModal;
