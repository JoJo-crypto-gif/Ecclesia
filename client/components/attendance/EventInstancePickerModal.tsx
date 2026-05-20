import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, Search, SlidersHorizontal } from 'lucide-react';
import Modal from '../Modal';
import { EventInstance } from '../../types';
import CustomSelect from '../CustomSelect';

type TimeFilter = 'all' | 'upcoming' | 'past';

interface EventInstancePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName?: string;
  instances: EventInstance[];
  selectedInstanceId?: string;
  onSelect: (instanceId: string) => void;
}

const monthOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const monthFilterOptions = [
  { value: 'all', label: 'All Months' },
  ...monthOptions.map((month, index) => ({ value: String(index), label: month })),
];

const toDateOnlyKey = (value: string) => value.split('T')[0];

const toLocalDate = (value: string) => {
  const [datePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

const EventInstancePickerModal: React.FC<EventInstancePickerModalProps> = ({
  isOpen,
  onClose,
  eventName,
  instances,
  selectedInstanceId,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedYear('all');
      setSelectedMonth('all');
      setTimeFilter('all');
    }
  }, [isOpen]);

  const years = useMemo(() => {
    const uniqueYears = new Set<number>();

    for (const inst of instances) {
      uniqueYears.add(toLocalDate(inst.date).getFullYear());
    }

    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [instances]);

  const yearOptions = useMemo(() => [
    { value: 'all', label: 'All Years' },
    ...years.map((year) => ({ value: String(year), label: String(year) })),
  ], [years]);

  const today = new Date().toISOString().split('T')[0];

  const filteredInstances = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const matches = instances.filter((inst) => {
      const date = toLocalDate(inst.date);
      const dateKey = toDateOnlyKey(inst.date);
      const isPast = dateKey < today;

      const yearMatches = selectedYear === 'all' || date.getFullYear() === Number(selectedYear);
      const monthMatches = selectedMonth === 'all' || date.getMonth() === Number(selectedMonth);
      const timeMatches =
        timeFilter === 'all' ||
        (timeFilter === 'past' ? isPast : !isPast);

      if (!yearMatches || !monthMatches || !timeMatches) {
        return false;
      }

      if (!search) {
        return true;
      }

      const fullDate = date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).toLowerCase();

      return (
        fullDate.includes(search) ||
        (inst.nameOverride || '').toLowerCase().includes(search) ||
        (inst.typeOverride || '').toLowerCase().includes(search) ||
        (inst.locationOverride || '').toLowerCase().includes(search)
      );
    });

    return matches.sort((a, b) => {
      const aDate = toLocalDate(a.date).getTime();
      const bDate = toLocalDate(b.date).getTime();
      const aUpcoming = toDateOnlyKey(a.date) >= today;
      const bUpcoming = toDateOnlyKey(b.date) >= today;

      if (aUpcoming !== bUpcoming) {
        return aUpcoming ? -1 : 1;
      }

      return aUpcoming ? aDate - bDate : bDate - aDate;
    });
  }, [instances, searchTerm, selectedYear, selectedMonth, timeFilter, today]);

  const hasFilters = selectedYear !== 'all' || selectedMonth !== 'all' || timeFilter !== 'all' || Boolean(searchTerm.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventName ? `Select Session - ${eventName}` : 'Select Session'}
      maxWidth="max-w-3xl"
    >
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search date or override..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
          <CustomSelect
            value={selectedYear}
            onChange={(val) => setSelectedYear(val)}
            options={yearOptions}
          />

          <CustomSelect
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            options={monthFilterOptions}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wide dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
            <SlidersHorizontal size={13} />
            Filters
          </div>

          {(['all', 'upcoming', 'past'] as TimeFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                timeFilter === value
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {value}
            </button>
          ))}

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedYear('all');
                setSelectedMonth('all');
                setTimeFilter('all');
              }}
              className="ml-auto text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden dark:border-slate-700 dark:bg-slate-900/50">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wide dark:border-slate-700 dark:text-slate-400">
            <span>Sessions</span>
            <span>{filteredInstances.length} found</span>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
            {filteredInstances.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No sessions match your current filters.
              </div>
            ) : (
              filteredInstances.map((inst) => {
                const date = toLocalDate(inst.date);
                const dateKey = toDateOnlyKey(inst.date);
                const isPast = dateKey < today;
                const isSelected = selectedInstanceId === inst.id;

                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => {
                      onSelect(inst.id);
                      onClose();
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-lg ${isPast ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                        <Calendar size={14} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${isPast ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                            {isPast ? 'Past' : 'Upcoming'}
                          </span>
                          {inst.nameOverride && <span className="truncate">Override: {inst.nameOverride}</span>}
                          {typeof inst.attendanceCount === 'number' && inst.attendanceCount > 0 && (
                            <span>{inst.attendanceCount} check-ins</span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="text-indigo-600 dark:text-indigo-400 mt-1">
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EventInstancePickerModal;
