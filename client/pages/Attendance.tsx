import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Calendar, Plus, QrCode, Users, Scan, Repeat, Trash2, FileText, UserCheck, Clock, MapPin } from 'lucide-react';
import Modal from '../components/Modal';
import { ChurchEvent, EventInstance, AttendanceRecord, User } from '../types';
import QrCodeModal from '../components/attendance/QrCodeModal';
import ManualCheckInModal from '../components/attendance/ManualCheckInModal';
import AttendanceReportModal from '../components/attendance/AttendanceReportModal';

interface AttendanceProps {
  user: User | null;
}

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const { 
    events, addEvent, deleteEvent, members, zones,
    fetchAllInstances, checkIn, fetchAttendance, removeAttendanceRecord
  } = useData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<EventInstance | null>(null);
  const [allInstancesMap, setAllInstancesMap] = useState<Record<string, EventInstance[]>>({});
  const [selectedInstanceIdMap, setSelectedInstanceIdMap] = useState<Record<string, string>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord[]>>({});
  
  // Modals
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const [newEvent, setNewEvent] = useState({
    name: '',
    type: 'Service',
    location: '',
    startTime: '09:00',
    isRecurring: false,
    recurrenceRule: 'weekly' as const,
    dayOfWeek: 0,
    zoneId: '',
  });

  const visibleEvents = useMemo(() => {
    if (user?.role === 'zone_leader') {
      return events.filter(event => event.zoneId === user.zoneId);
    }
    return events;
  }, [events, user?.role, user?.zoneId]);

  // Fetch a 4-month window of instances
  const loadInstances = useCallback(async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 60);
    const fromDate = pastDate.toISOString().split('T')[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    const toDate = futureDate.toISOString().split('T')[0];

    const allInstances = await fetchAllInstances(fromDate, toDate);
    
    // Map: eventId -> array of instances
    const instMap: Record<string, EventInstance[]> = {};
    const defaultIdsMap: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];

    for (const event of visibleEvents) {
      const eventInstances = allInstances
        .filter(inst => inst.eventId === event.id && inst.status !== 'cancelled')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      instMap[event.id] = eventInstances;

      if (eventInstances.length > 0) {
        const upcomingEvent = eventInstances.find(i => i.date.split('T')[0] >= today);
        defaultIdsMap[event.id] = upcomingEvent ? upcomingEvent.id : eventInstances[eventInstances.length - 1].id;
      }
    }
    setAllInstancesMap(instMap);
    setSelectedInstanceIdMap(prev => ({ ...defaultIdsMap, ...prev })); // preserve user selection if it exists
  }, [visibleEvents, fetchAllInstances]);

  useEffect(() => {
    if (visibleEvents.length > 0) {
      loadInstances();
    }
  }, [visibleEvents, loadInstances]);

  // Load attendance for selected instances
  useEffect(() => {
    const loadAttendance = async () => {
      const attMap: Record<string, AttendanceRecord[]> = { ...attendanceMap };
      let changed = false;
      for (const eventId of Object.keys(selectedInstanceIdMap)) {
        const instanceId = selectedInstanceIdMap[eventId];
        if (instanceId && !attMap[instanceId]) { // Lazy fetch if not in state
          const records = await fetchAttendance(instanceId);
          attMap[instanceId] = records;
          changed = true;
        }
      }
      if (changed) setAttendanceMap(attMap);
    };
    
    if (Object.keys(selectedInstanceIdMap).length > 0) {
      loadAttendance();
    }
  }, [selectedInstanceIdMap, fetchAttendance]);

  const getSelectedInstance = useCallback((eventId: string) => {
    const instances = allInstancesMap[eventId] || [];
    const targetId = selectedInstanceIdMap[eventId];
    return instances.find(i => i.id === targetId) || instances[0] || null;
  }, [allInstancesMap, selectedInstanceIdMap]);

  const handleCreateEvent = async () => {
    if (newEvent.name) {
      const eventData: any = {
        name: newEvent.name,
        type: newEvent.type,
        location: newEvent.location || undefined,
        startTime: newEvent.startTime || undefined,
        isRecurring: newEvent.isRecurring,
      };
      
      if (newEvent.isRecurring) {
        eventData.recurrenceRule = newEvent.recurrenceRule;
        eventData.dayOfWeek = newEvent.dayOfWeek;
      } else {
        // One-off event: use today's date
        eventData.date = new Date().toISOString().split('T')[0];
      }

      if (user?.role === 'admin' && newEvent.zoneId) {
        eventData.zoneId = newEvent.zoneId;
      }

      await addEvent(eventData);
      setIsModalOpen(false);
      setNewEvent({ 
        name: '', type: 'Service', location: '', startTime: '09:00',
        isRecurring: false, recurrenceRule: 'weekly', dayOfWeek: 0, zoneId: ''
      });
      // Refresh instances
      setTimeout(loadInstances, 500);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this event and all its instances?")) {
      await deleteEvent(id);
    }
  };

  const openQRModal = (event: ChurchEvent) => {
    setSelectedEvent(event);
    setSelectedInstance(getSelectedInstance(event.id));
    setIsQRModalOpen(true);
  };

  const openManualModal = (event: ChurchEvent) => {
    setSelectedEvent(event);
    setSelectedInstance(getSelectedInstance(event.id));
    setIsManualModalOpen(true);
  };

  const launchKioskMode = (eventId: string) => {
    const instance = getSelectedInstance(eventId);
    if (instance) {
      navigate(`/kiosk/${instance.id}`);
    } else {
      alert('No instance found for this event.');
    }
  };

  const openReportModal = (event: ChurchEvent) => {
    setSelectedEvent(event);
    setSelectedInstance(getSelectedInstance(event.id));
    setIsReportModalOpen(true);
  };

  const getAttendanceCount = (eventId: string) => {
    const instance = getSelectedInstance(eventId);
    if (!instance) return 0;
    return attendanceMap[instance.id]?.length || instance.attendanceCount || 0;
  };

  // Manual attendance toggle
  const handleToggleAttendance = async (memberId: string, isPresent: boolean) => {
    if (!selectedInstance) return;
    
    if (isPresent) {
      await removeAttendanceRecord(selectedInstance.id, memberId);
    } else {
      await checkIn(selectedInstance.id, memberId);
    }
    
    // Refresh attendance for this instance
    const records = await fetchAttendance(selectedInstance.id);
    setAttendanceMap(prev => ({ ...prev, [selectedInstance.id]: records }));
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Attendance Manager</h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400">Create events, track check-ins, and view daily reports.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
        >
          <Plus size={20} />
          New Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleEvents.map((event) => {
            const totalCheckins = getAttendanceCount(event.id);
            const currentSelected = getSelectedInstance(event.id);
            const isPastEvent = currentSelected ? currentSelected.date.split('T')[0] < new Date().toISOString().split('T')[0] : false;

            return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group dark:bg-slate-900 dark:border-slate-800 dark:hover:shadow-none dark:hover:border-slate-700 hover-3d-card preserve-3d relative">
                    {/* Badge for Recurring Events */}
                    {event.isRecurring && (
                        <div className="absolute top-4 right-4 z-20">
                            <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                                <Repeat size={10} /> RECURRING
                            </span>
                        </div>
                    )}
                    
                    <div className="p-6 relative">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                <QrCode size={100} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        
                        <div className="relative z-10 transform transition-transform duration-300 group-hover:translate-z-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                                        event.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>
                                        {currentSelected?.typeOverride || event.type}
                                    </span>
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400 truncate pr-16">{currentSelected?.nameOverride || event.name}</h3>
                                
                                {/* Date Selection Dropdown */}
                                <div className="mt-2 mb-3 relative z-20">
                                    {allInstancesMap[event.id]?.length > 0 ? (
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden dark:bg-slate-900/50 dark:border-slate-800 transition-colors hover:border-indigo-300 dark:hover:border-indigo-500/50">
                                            <div className="pl-3 pr-2 py-2 text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                                                <Calendar size={14} />
                                            </div>
                                            <div className="relative flex-1">
                                                <select 
                                                    value={selectedInstanceIdMap[event.id] || ''}
                                                    onChange={(e) => setSelectedInstanceIdMap(prev => ({ ...prev, [event.id]: e.target.value }))}
                                                    className="w-full bg-transparent px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none appearance-none cursor-pointer dark:text-slate-300"
                                                >
                                                    {allInstancesMap[event.id].map(inst => {
                                                        const dateStr = inst.date.split('T')[0];
                                                        const isPast = dateStr < new Date().toISOString().split('T')[0];
                                                        return (
                                                            <option key={inst.id} value={inst.id}>
                                                                {new Date(inst.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                {isPast ? ' (Past)' : ' (Upcoming)'}
                                                                {inst.nameOverride ? ` - ${inst.nameOverride}` : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 dark:text-slate-500">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                                            <Calendar size={14} />
                                            <span className="italic text-slate-400">No sessions available</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Time and location */}
                                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mb-4">
                                    {event.startTime && (
                                      <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {event.startTime}
                                      </span>
                                    )}
                                    { (currentSelected?.locationOverride || event.location) && (
                                      <span className="flex items-center gap-1">
                                        <MapPin size={12} />
                                        {currentSelected?.locationOverride || event.location}
                                      </span>
                                    )}
                                    {event.isRecurring && event.recurrenceRule && (
                                      <span className="text-purple-500 dark:text-purple-400 capitalize">
                                        {event.recurrenceRule}{event.dayOfWeek !== undefined ? ` • ${dayNames[event.dayOfWeek]}s` : ''}
                                      </span>
                                    )}
                                </div>
                                
                                <div className="mt-4 flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <Users size={16} className="text-slate-400" />
                                    <span className="font-bold text-lg">{totalCheckins}</span>
                                    <span className="text-sm text-slate-400 font-medium">Check-ins</span>
                                </div>
                        </div>
                        
                        {/* KIOSK LAUNCH BUTTON (Big) */}
                        <div className="mt-6 mb-2 transform transition-transform duration-300 group-hover:translate-z-3 relative z-20">
                           <button 
                              onClick={() => !isPastEvent && launchKioskMode(event.id)}
                              disabled={isPastEvent}
                              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-md ${
                                isPastEvent 
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 shadow-none' 
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg dark:bg-indigo-500 dark:hover:bg-indigo-600'
                              }`}
                              title={isPastEvent ? "Check-in is disabled for past events" : "Launch Kiosk"}
                           >
                             <Scan size={20} /> Launch Kiosk Mode
                           </button>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 dark:border-slate-800 transform transition-transform duration-300 group-hover:translate-z-2">
                            <button 
                                onClick={() => !isPastEvent && openQRModal(event)}
                                disabled={isPastEvent}
                                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl font-bold transition-colors text-[10px] uppercase tracking-wide ${
                                  isPastEvent
                                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed dark:bg-slate-800/50 dark:text-slate-600'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-400'
                                }`}
                                title={isPastEvent ? "Check-in is disabled for past events" : "Print QR"}
                            >
                                <QrCode size={16} />
                                Print QR
                            </button>
                            <button 
                                onClick={() => !isPastEvent && openManualModal(event)}
                                disabled={isPastEvent}
                                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl font-bold transition-colors text-[10px] uppercase tracking-wide ${
                                  isPastEvent
                                    ? 'bg-indigo-50/50 text-indigo-300/50 cursor-not-allowed dark:bg-indigo-500/5 dark:text-indigo-500/30'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20'
                                }`}
                                title={isPastEvent ? "Check-in is disabled for past events" : "Manual Check-in"}
                            >
                                <UserCheck size={16} />
                                Manual
                            </button>
                            <button 
                                onClick={() => openReportModal(event)}
                                className="flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-600 py-2 rounded-xl font-bold hover:bg-slate-100 hover:text-indigo-600 transition-colors text-[10px] uppercase tracking-wide dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                                title="Reports"
                            >
                                <FileText size={16} />
                                Reports
                            </button>
                            <button 
                                onClick={() => handleDeleteEvent(event.id)}
                                className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 text-slate-400 py-2 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors text-[10px] uppercase tracking-wide dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                title="Delete Event"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Create Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Event"
      >
        <div className="p-6 space-y-5">
           <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Event Name</label>
            <input 
              type="text" 
              value={newEvent.name}
              onChange={e => setNewEvent({...newEvent, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="e.g. Sunday Service"
            />
           </div>
           
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
               <div className="flex items-center gap-3">
                   <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${newEvent.isRecurring ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`} onClick={() => setNewEvent({...newEvent, isRecurring: !newEvent.isRecurring})}>
                       <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${newEvent.isRecurring ? 'translate-x-4' : ''}`}></div>
                   </div>
                   <div>
                       <div className="font-bold text-slate-800 text-sm dark:text-white">Recurring Event</div>
                       <div className="text-xs text-slate-500 dark:text-slate-400">Auto-generates weekly instances for attendance tracking.</div>
                   </div>
               </div>
           </div>

           {newEvent.isRecurring && (
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Frequency</label>
                 <select 
                   value={newEvent.recurrenceRule}
                   onChange={e => setNewEvent({...newEvent, recurrenceRule: e.target.value as any})}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                 >
                   <option value="weekly">Weekly</option>
                   <option value="biweekly">Bi-weekly</option>
                   <option value="monthly">Monthly</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Day of Week</label>
                 <select 
                   value={newEvent.dayOfWeek}
                   onChange={e => setNewEvent({...newEvent, dayOfWeek: parseInt(e.target.value)})}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                 >
                   {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
                 </select>
               </div>
             </div>
           )}

           <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Start Time</label>
                <input 
                  type="time" 
                  value={newEvent.startTime}
                  onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
               </div>
               <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Type</label>
                <select 
                  value={newEvent.type}
                  onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                    <option value="Service">Service</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Special">Special Event</option>
                </select>
               </div>
           </div>

           <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Location</label>
            <input 
              type="text" 
              value={newEvent.location}
              onChange={e => setNewEvent({...newEvent, location: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="e.g. Main Auditorium"
            />
           </div>

           {user?.role === 'admin' && (
             <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Zone</label>
              <select 
                value={newEvent.zoneId}
                onChange={e => setNewEvent({ ...newEvent, zoneId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                <option value="">All Zones (Global)</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
             </div>
           )}
           
           <div className="pt-4 flex justify-end gap-3">
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleCreateEvent}
                 className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 dark:bg-indigo-500 dark:hover:bg-indigo-600"
               >
                 Create Event
               </button>
           </div>
        </div>
      </Modal>

      {/* Manual Attendance Modal */}
      <ManualCheckInModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        event={selectedEvent}
        instance={selectedInstance}
        members={members}
        onToggleAttendance={handleToggleAttendance}
      />

      {/* Report Modal */}
      <AttendanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        event={selectedEvent}
        instance={selectedInstance}
      />

      {/* QR Display Modal */}
      <QrCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        event={selectedEvent}
        instance={selectedInstance}
      />
    </div>
  );
};

export default Attendance;
