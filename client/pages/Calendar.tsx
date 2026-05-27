import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, MapPin, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import { ChurchEvent, EventInstance, User } from '../types';

interface CalendarProps {
  user: User | null;
}

  // Helper to format date reliably to YYYY-MM-DD without UTC timezone shifts
  const formatDateLocal = (date: Date) => {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  };

const Calendar: React.FC<CalendarProps> = ({ user }) => {
  const { events, addEvent, fetchAllInstances, updateInstance, generateInstances, zones } = useData();
  const { success: toastSuccess, error: toastError } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instances, setInstances] = useState<EventInstance[]>([]);
  
  const [selectedInstance, setSelectedInstance] = useState<EventInstance | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateLocal(new Date()));
  const [isGenerating, setIsGenerating] = useState(false);

  const [editInstanceForm, setEditInstanceForm] = useState({
    nameOverride: '',
    typeOverride: '',
    locationOverride: '',
    status: 'scheduled',
    notes: '',
  });

  const canEditSelected = useMemo(() => {
    if (!user || !selectedEvent) return false;
    if (user.role === 'admin') return true;
    return selectedEvent.zoneId === user.zoneId;
  }, [user, selectedEvent]);
  
  // Event Creation State
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Service',
    isRecurring: false,
    recurrenceRule: 'weekly' as const,
    dayOfWeek: 0,
    zoneId: '',
  });

  // Fetch instances for the visible month range
  const loadInstances = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    // Get a range covering the full calendar grid (prev month days + current + next month days)
    const from = formatDateLocal(new Date(year, month - 1, 1));
    const to = formatDateLocal(new Date(year, month + 2, 0));
    
    const allInstances = await fetchAllInstances(from, to);
    setInstances(allInstances);
  }, [currentDate, fetchAllInstances]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  // Build a map of dateStr -> events (via instances)
  const eventsByDate = useMemo(() => {
    const map: Record<string, { event: ChurchEvent; instance: EventInstance }[]> = {};
    for (const inst of instances) {
      const event = events.find(e => e.id === inst.eventId);
      if (event) {
        const dateStr = inst.date.split('T')[0]; // Normalize ISO to YYYY-MM-DD
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push({ event, instance: inst });
      }
    }
    return map;
  }, [instances, events]);

  // --- Calendar Logic ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async () => {
    if (newEvent.name && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const eventData: any = {
          name: newEvent.name,
          type: newEvent.type,
          isRecurring: newEvent.isRecurring,
        };
        
        if (newEvent.isRecurring) {
          eventData.recurrenceRule = newEvent.recurrenceRule;
          eventData.dayOfWeek = newEvent.dayOfWeek;
        } else {
          eventData.date = newEvent.date;
        }

        if (user?.role === 'admin' && newEvent.zoneId) {
          eventData.zoneId = newEvent.zoneId;
        }

        await addEvent(eventData);
        setIsModalOpen(false);
        setNewEvent({ 
          name: '', 
          date: new Date().toISOString().split('T')[0], 
          type: 'Service', 
          isRecurring: false,
          recurrenceRule: 'weekly',
          dayOfWeek: 0,
          zoneId: '',
        });
        // Refresh instances
        setTimeout(loadInstances, 500);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const openAddEventModal = (dateStr?: string) => {
    if (dateStr) {
      setNewEvent(prev => ({ ...prev, date: dateStr }));
    }
    setIsModalOpen(true);
  };

  const openEditModal = (instance: EventInstance, event: ChurchEvent) => {
    setSelectedInstance(instance);
    setSelectedEvent(event);
    setEditInstanceForm({
      nameOverride: instance.nameOverride || '',
      typeOverride: instance.typeOverride || '',
      locationOverride: instance.locationOverride || '',
      status: instance.status,
      notes: instance.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateSelectedInstance = async () => {
    if (!selectedInstance) return;
    const success = await updateInstance(selectedInstance.id, {
      nameOverride: editInstanceForm.nameOverride,
      typeOverride: editInstanceForm.typeOverride,
      locationOverride: editInstanceForm.locationOverride,
      status: editInstanceForm.status as any,
      notes: editInstanceForm.notes,
    });
    if (success) {
      setIsEditModalOpen(false);
      loadInstances();
    }
  };

  const handleGenerateFuture = async () => {
    if (!selectedEvent) return;
    setIsGenerating(true);
    const success = await generateInstances(selectedEvent.id, 52);
    setIsGenerating(false);
    if (success) {
      setTimeout(loadInstances, 500);
      toastSuccess('Successfully scheduled instances for the next year!');
    } else {
      toastError('Failed to generate instances.');
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    
    const prevMonthDays = [];
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthIdx);
    
    for (let i = startDay - 1; i >= 0; i--) {
        const date = new Date(prevMonthYear, prevMonthIdx, daysInPrevMonth - i);
        prevMonthDays.push({ 
            date, 
            day: daysInPrevMonth - i, 
            isCurrentMonth: false, 
            dateStr: formatDateLocal(date)
        });
    }

    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        currentMonthDays.push({ 
            date, 
            day: i, 
            isCurrentMonth: true, 
            dateStr: formatDateLocal(date)
        });
    }

    const nextMonthDays = [];
    const totalSlots = 42;
    const remainingSlots = totalSlots - (prevMonthDays.length + currentMonthDays.length);
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    
    for (let i = 1; i <= remainingSlots; i++) {
        const date = new Date(nextMonthYear, nextMonthIdx, i);
        nextMonthDays.push({ 
            date, 
            day: i, 
            isCurrentMonth: false, 
            dateStr: formatDateLocal(date)
        });
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  }, [currentDate]);

  const getEventsForDate = (dateStr: string) => {
    return eventsByDate[dateStr] || [];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const getEventTypeColor = (type: string) => {
      switch(type) {
          case 'Service': return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800';
          case 'Meeting': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
          case 'Special': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
          default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const recurrenceOptions = useMemo(() => [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ], []);

  const dayOfWeekOptions = useMemo(() => dayNames.map((d, i) => ({ value: i, label: d })), [dayNames]);

  const typeOptions = useMemo(() => [
    { value: 'Service', label: 'Service' },
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Special', label: 'Special Event' },
  ], []);

  const zoneOptions = useMemo(() => [
    { value: '', label: 'All Zones (Global)' },
    ...zones.map(zone => ({ value: zone.id, label: zone.name }))
  ], [zones]);

  const typeOverrideOptions = useMemo(() => [
    { value: '', label: `Default (${selectedEvent?.type || ''})` },
    { value: 'Service', label: 'Service' },
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Special', label: 'Special Event' },
  ], [selectedEvent]);

  const statusOptions = useMemo(() => [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ], []);

  return (
    <div className="space-y-6 animate-enter min-h-[calc(100vh-140px)] flex flex-col pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="w-full md:w-auto flex justify-between items-center sm:block">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Calendar</h1>
            <p className="text-slate-500 mt-1 dark:text-slate-400 text-xs sm:text-sm">Manage church events and schedules.</p>
          </div>
          <button 
            onClick={() => openAddEventModal(selectedDateStr)}
            className="sm:hidden flex items-center justify-center bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="w-full md:w-auto flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
             <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 dark:bg-slate-900 dark:border-slate-800 flex-1 sm:flex-none">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors dark:hover:bg-slate-800">
                    <ChevronLeft size={18} sm:size={20} />
                </button>
                <div className="px-2 sm:px-4 py-2 font-bold text-slate-700 min-w-[120px] sm:min-w-[140px] text-center dark:text-white select-none text-sm sm:text-base">
                    {months[currentDate.getMonth()].substring(0, 3)} {currentDate.getFullYear()}
                </div>
                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors dark:hover:bg-slate-800">
                    <ChevronRight size={18} sm:size={20} />
                </button>
             </div>
             <div className="flex gap-2">
                <button 
                    onClick={handleToday}
                    className="px-3 sm:px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 text-xs sm:text-sm"
                >
                    Today
                </button>
                <button 
                    onClick={() => openAddEventModal(selectedDateStr)}
                    className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
                >
                    <Plus size={20} />
                    <span>Add Event</span>
                </button>
             </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="min-h-[600px] flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col dark:bg-slate-900 dark:border-slate-800">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:bg-slate-950/50 dark:border-slate-800">
              {weekDays.map(day => (
                  <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                      {day}
                  </div>
              ))}
          </div>
          
          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {calendarDays.map((dayObj, idx) => {
                  const dayEventItems = getEventsForDate(dayObj.dateStr);
                  const isTodayDate = isToday(dayObj.date);
                  
                const isSelected = dayObj.dateStr === selectedDateStr;
                
                return (
                    <div 
                      key={`${dayObj.dateStr}-${idx}`}
                      onClick={() => {
                        setSelectedDateStr(dayObj.dateStr);
                      }}
                      onDoubleClick={() => openAddEventModal(dayObj.dateStr)}
                      className={`
                          border-b border-r border-slate-100 p-1 sm:p-2 min-h-[60px] sm:min-h-[100px] relative transition-all group
                          cursor-pointer dark:border-slate-800
                          ${!dayObj.isCurrentMonth ? 'bg-slate-50/30 dark:bg-slate-950/20' : 'bg-white dark:bg-slate-900'}
                          ${isSelected ? 'ring-2 ring-inset ring-indigo-500/50 z-10 bg-indigo-50/30 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                      `}
                    >
                        <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                            <span className={`
                                w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all
                                ${isTodayDate 
                                  ? 'bg-indigo-600 text-white shadow-md' 
                                  : isSelected ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : (dayObj.isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600')}
                            `}>
                                {dayObj.day}
                            </span>
                        </div>
                        
                        {/* Event Indicators */}
                        <div className="space-y-1 overflow-y-auto max-h-[40px] sm:max-h-[100px] scrollbar-hide">
                            {/* Desktop: Full Banners */}
                            <div className="hidden sm:block space-y-1">
                                {dayEventItems.map(({ event, instance }) => (
                                    <div 
                                      key={instance.id}
                                      className={`
                                          text-[10px] font-bold px-2 py-1 rounded-md border truncate transition-transform hover:scale-[1.02]
                                          ${getEventTypeColor(instance.typeOverride || event.type)}
                                          ${instance.status === 'cancelled' ? 'opacity-50 line-through' : ''}
                                      `}
                                      title={instance.nameOverride || event.name}
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          openEditModal(instance, event);
                                      }}
                                    >
                                        {event.isRecurring && <Repeat size={8} className="inline mr-1" />}
                                        {instance.nameOverride || event.name}
                                    </div>
                                ))}
                            </div>

                            {/* Mobile: Dots */}
                            <div className="flex sm:hidden flex-wrap gap-1 justify-center mt-1">
                                {dayEventItems.slice(0, 4).map(({ event, instance }) => (
                                    <div 
                                      key={instance.id}
                                      className={`w-1.5 h-1.5 rounded-full ${instance.typeOverride === 'Meeting' || event.type === 'Meeting' ? 'bg-emerald-500' : instance.typeOverride === 'Special' || event.type === 'Special' ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                    />
                                ))}
                                {dayEventItems.length > 4 && <div className="text-[8px] text-slate-400 font-bold">+</div>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Mobile Agenda List (Visible only on mobile) */}
        <div className="flex-1 lg:hidden border-t border-slate-200 bg-slate-50/50 dark:bg-slate-950/30 dark:border-slate-800 overflow-y-auto">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CalendarIcon size={16} className="text-indigo-600" />
                        {new Date(selectedDateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <button 
                        onClick={() => openAddEventModal(selectedDateStr)}
                        className="text-indigo-600 text-xs font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg dark:bg-indigo-500/10 dark:text-indigo-400"
                    >
                        <Plus size={14} /> Add
                    </button>
                </div>

                {getEventsForDate(selectedDateStr).length > 0 ? (
                    <div className="space-y-3">
                        {getEventsForDate(selectedDateStr).map(({ event, instance }) => (
                            <div 
                                key={instance.id}
                                onClick={() => openEditModal(instance, event)}
                                className={`
                                    bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4 dark:bg-slate-900 transition-all active:scale-[0.98]
                                    ${instance.status === 'cancelled' ? 'opacity-60 border-slate-200 dark:border-slate-800' : 'border-indigo-100 dark:border-indigo-500/20'}
                                `}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getEventTypeColor(instance.typeOverride || event.type)} border-none shadow-inner`}>
                                    {instance.typeOverride === 'Meeting' || event.type === 'Meeting' ? <Users size={20} /> : instance.typeOverride === 'Special' || event.type === 'Special' ? <Plus size={20} /> : <CalendarIcon size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-900 truncate dark:text-white flex items-center gap-1.5">
                                        {event.isRecurring && <Repeat size={12} className="text-slate-400" />}
                                        {instance.nameOverride || event.name}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {event.startTime || 'No time'}</span>
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {instance.locationOverride || event.location || 'Church'}</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-300" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white/50 rounded-3xl border border-dashed border-slate-200 dark:bg-slate-900/30 dark:border-slate-800">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 dark:bg-slate-800">
                            <Plus size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No events scheduled for this day.</p>
                        <button onClick={() => openAddEventModal(selectedDateStr)} className="mt-4 text-indigo-600 text-xs font-bold hover:underline">Plan something new</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Event to Calendar"
      >
        <div className="p-6 space-y-5">
           <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Event Name</label>
            <input 
              type="text" 
              value={newEvent.name}
              onChange={e => setNewEvent({...newEvent, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="e.g. Prayer Meeting"
              autoFocus
            />
           </div>
           
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
               <div className="flex items-center gap-3">
                   <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${newEvent.isRecurring ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`} onClick={() => setNewEvent({...newEvent, isRecurring: !newEvent.isRecurring})}>
                       <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${newEvent.isRecurring ? 'translate-x-4' : ''}`}></div>
                   </div>
                   <div>
                       <div className="font-bold text-slate-800 text-sm dark:text-white">Recurring Event</div>
                       <div className="text-xs text-slate-500 dark:text-slate-400">Reuse this event for regular services.</div>
                   </div>
               </div>
           </div>

           {newEvent.isRecurring ? (
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Frequency</label>
                 <CustomSelect
                   value={newEvent.recurrenceRule}
                   onChange={val => setNewEvent({...newEvent, recurrenceRule: val as any})}
                   options={recurrenceOptions}
                 />
               </div>
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Day of Week</label>
                 <CustomSelect
                   value={newEvent.dayOfWeek}
                   onChange={val => setNewEvent({...newEvent, dayOfWeek: parseInt(val)})}
                   options={dayOfWeekOptions}
                 />
               </div>
             </div>
           ) : (
             <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Date</label>
                <input 
                  type="date" 
                  value={newEvent.date}
                  onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
               </div>
               <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Type</label>
                <CustomSelect
                  value={newEvent.type}
                  onChange={val => setNewEvent({...newEvent, type: val})}
                  options={typeOptions}
                />
               </div>
             </div>
           )}

           {newEvent.isRecurring && (
             <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Type</label>
              <CustomSelect
                value={newEvent.type}
                onChange={val => setNewEvent({...newEvent, type: val})}
                options={typeOptions}
              />
             </div>
           )}

           {user?.role === 'admin' && (
             <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Zone</label>
              <CustomSelect
                value={newEvent.zoneId}
                onChange={val => setNewEvent({ ...newEvent, zoneId: val })}
                options={zoneOptions}
                placeholder="All Zones (Global)"
              />
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
                  disabled={isSubmitting || !newEvent.name}
                  className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 dark:bg-indigo-500 dark:hover:bg-indigo-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Adding...</span>
                    </>
                  ) : (
                    'Add to Calendar'
                  )}
                </button>
           </div>
        </div>
      </Modal>

      {/* Edit Instance Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={canEditSelected ? "Edit Specific Date" : "View Specific Date"}
      >
        <div className="p-6 space-y-5">
           {!canEditSelected && (
               <div className="bg-red-50 p-4 rounded-xl border border-red-100 dark:bg-red-500/10 dark:border-red-500/20">
                   <p className="text-sm text-red-800 dark:text-red-200">
                       <strong>Read Only:</strong> You do not have permission to modify this event because it is managed by Administrators.
                   </p>
               </div>
           )}

           {canEditSelected && (
               <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
                   <p className="text-sm text-amber-800 dark:text-amber-200">
                       You are editing a <strong>single occurrence</strong> ({selectedInstance && formatDateLocal(new Date(selectedInstance.date))}). This overrides the main template properties for this day only.
                   </p>
               </div>
           )}
           
           <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Name Override <span className="font-normal text-slate-400 capitalize">(Default: {selectedEvent?.name})</span></label>
            <input 
              type="text" 
              value={editInstanceForm.nameOverride}
              onChange={e => setEditInstanceForm({...editInstanceForm, nameOverride: e.target.value})}
              disabled={!canEditSelected}
              className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white ${!canEditSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder={`Leave blank to use "${selectedEvent?.name}"`}
            />
           </div>

           <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Location Override <span className="font-normal text-slate-400 capitalize">(Default: {selectedEvent?.location || 'Church'})</span></label>
            <input 
              type="text" 
              value={editInstanceForm.locationOverride}
              onChange={e => setEditInstanceForm({...editInstanceForm, locationOverride: e.target.value})}
              disabled={!canEditSelected}
              className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white ${!canEditSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder={`Leave blank to use "${selectedEvent?.location || 'Church'}"`}
            />
           </div>

           <div className="grid grid-cols-2 gap-4">
                <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Type Override</label>
                 <CustomSelect
                   value={editInstanceForm.typeOverride}
                   onChange={val => setEditInstanceForm({...editInstanceForm, typeOverride: val})}
                   disabled={!canEditSelected}
                   options={typeOverrideOptions}
                   placeholder={`Default (${selectedEvent?.type || ''})`}
                 />
                </div>
                <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Status</label>
                 <CustomSelect
                   value={editInstanceForm.status}
                   onChange={val => setEditInstanceForm({...editInstanceForm, status: val})}
                   disabled={!canEditSelected}
                   options={statusOptions}
                 />
                </div>
           </div>

           {selectedEvent?.isRecurring && canEditSelected && (
               <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                   <h3 className="text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">Recurring Management</h3>
                   <button 
                     onClick={handleGenerateFuture}
                     disabled={isGenerating}
                     className="w-full py-3 px-4 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-xl hover:bg-indigo-100 transition-colors dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 disabled:opacity-50"
                   >
                     {isGenerating ? 'Generating...' : 'Generate Next 1 Year (52 weeks)'}
                   </button>
                   <p className="text-xs text-slate-500 mt-2 text-center dark:text-slate-400">Pushes the calendar out an additional 52 weeks from the end date.</p>
               </div>
           )}

           <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
               <button 
                 onClick={() => setIsEditModalOpen(false)}
                 className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
               >
                 {canEditSelected ? 'Cancel' : 'Close'}
               </button>
               {canEditSelected && (
                 <button 
                   onClick={handleUpdateSelectedInstance}
                   className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                 >
                   Save Overrides
                 </button>
               )}
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default Calendar;
