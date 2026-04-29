import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Gift, Heart } from 'lucide-react';
import { User } from '../types';

interface CelebrationsProps {
  user: User | null;
}

type CelebrationType = 'birthday' | 'anniversary';
type PeriodType = 'week' | 'month';
type WindowType = 'current' | 'upcoming';

interface CelebrationItem {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  date: string;
  day: number;
  month: number;
  type: CelebrationType;
  milestone: number;
  milestoneLabel: string;
}

interface CelebrationMeta {
  type: CelebrationType;
  period: PeriodType;
  window: WindowType;
  rangeStart: string;
  rangeEnd: string;
}

const Celebrations: React.FC<CelebrationsProps> = ({ user }) => {
  const [type, setType] = useState<CelebrationType>('birthday');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [windowFilter, setWindowFilter] = useState<WindowType>('current');
  const [items, setItems] = useState<CelebrationItem[]>([]);
  const [meta, setMeta] = useState<CelebrationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCelebrations = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          type,
          period,
          window: windowFilter,
        });
        const res = await fetch(`/api/members/celebrations?${params.toString()}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error?.message || 'Failed to fetch celebrations');
        }
        setItems(data.data || []);
        setMeta(data.meta || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch celebrations');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadCelebrations();
  }, [type, period, windowFilter]);

  const title = useMemo(() => {
    if (type === 'birthday') return 'Birthdays';
    return 'Wedding Anniversaries';
  }, [type]);

  return (
    <div className="space-y-6 animate-enter pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Celebrations</h1>
        <p className="text-slate-500 text-sm sm:text-base dark:text-slate-400">
          Track birthdays and anniversaries by week or month, including upcoming periods.
        </p>
        {user?.role === 'zone_leader' && (
          <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400">
            Showing members assigned to your zone.
          </p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 dark:bg-slate-800 dark:border-slate-700">
            <button
              onClick={() => setType('birthday')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-bold transition-colors ${
                type === 'birthday'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><Gift size={14} /> Birthdays</span>
            </button>
            <button
              onClick={() => setType('anniversary')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-bold transition-colors ${
                type === 'anniversary'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><Heart size={14} /> Anniversaries</span>
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>

            <select
              value={windowFilter}
              onChange={(e) => setWindowFilter(e.target.value as WindowType)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="current">Current</option>
              <option value="upcoming">Upcoming Next</option>
            </select>
          </div>
        </div>
      </div>

      {meta && (
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl px-4 py-3 text-sm dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300">
          <span className="inline-flex items-center gap-2 font-medium">
            <CalendarDays size={15} />
            {title} between <strong>{meta.rangeStart}</strong> and <strong>{meta.rangeEnd}</strong>
          </span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center dark:bg-slate-900 dark:border-slate-800">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading celebrations...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center dark:bg-slate-900 dark:border-slate-800">
          <p className="text-slate-500">No {title.toLowerCase()} found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}-${item.date}`}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {item.avatarUrl ? (
                    <img src={item.avatarUrl} alt={`${item.firstName} ${item.lastName}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs">
                      {item.firstName?.[0]}{item.lastName?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{item.firstName} {item.lastName}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.date}</p>
                </div>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20">
                  {item.milestoneLabel} {item.milestone}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Celebrations;
