import React, { useState, useEffect } from 'react';
import { Calendar, ChevronRight, Search, CalendarDays } from 'lucide-react';
import Modal from '../Modal';
import { ChurchEvent, EventInstance } from '../../types';

interface ReportSessionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ChurchEvent[];
  fetchInstances: (eventId: string) => Promise<EventInstance[]>;
  onSelect: (eventId: string, instanceId: string) => void;
}

const ReportSessionPickerModal: React.FC<ReportSessionPickerModalProps> = ({
  isOpen,
  onClose,
  events,
  fetchInstances,
  onSelect,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [instances, setInstances] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedEventId('');
      setSearchQuery('');
      setInstances([]);
    }
  }, [isOpen]);

  const handleEventSelect = async (eventId: string) => {
    setSelectedEventId(eventId);
    setLoading(true);
    setStep(2);
    setSearchQuery('');
    
    try {
      const data = await fetchInstances(eventId);
      const sorted = data
        .filter(i => i.status !== 'cancelled')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // newest first
      setInstances(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceSelect = (instanceId: string) => {
    onSelect(selectedEventId, instanceId);
    onClose();
  };

  const filteredEvents = events.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const filteredInstances = instances.filter(i => {
    if (!searchQuery) return true;
    const dateStr = new Date(i.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
    return dateStr.includes(searchQuery.toLowerCase());
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'Select Event for Report' : 'Select Session Date'}
      maxWidth="max-w-2xl"
    >
      <div className="p-6 space-y-4">
        {step === 2 && (
          <button 
            onClick={() => { setStep(1); setSearchQuery(''); }}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 dark:text-indigo-400"
          >
            ← Back to Events
          </button>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={step === 1 ? "Search events..." : "Search dates..."}
            className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden dark:border-slate-700 dark:bg-slate-900/50 h-[300px] overflow-y-auto">
          {step === 1 ? (
            <div className="p-2 space-y-1">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No events found.</div>
              ) : (
                filteredEvents.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => handleEventSelect(ev.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-transparent bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors flex justify-between items-center dark:bg-slate-800 dark:hover:border-indigo-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <CalendarDays size={16} />
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-100">{ev.name}</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {loading ? (
                 <div className="text-center py-10 text-slate-400 text-sm">Loading dates...</div>
              ) : filteredInstances.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No recorded dates for this event.</div>
              ) : (
                filteredInstances.map(inst => {
                  const dateStr = new Date(inst.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                  return (
                    <button
                      key={inst.id}
                      onClick={() => handleInstanceSelect(inst.id)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-transparent bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors flex justify-between items-center dark:bg-slate-800 dark:hover:border-indigo-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <Calendar size={16} />
                        </div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">{dateStr}</div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ReportSessionPickerModal;
