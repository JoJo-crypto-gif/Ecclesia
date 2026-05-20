import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Droplet, Gift, Heart, PartyPopper, Sparkles } from 'lucide-react';
import { User } from '../types';
import { apiFetch } from '../utils/api';
import CustomSelect from '../components/CustomSelect';

const periodOptions = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const windowOptions = [
  { value: 'today', label: 'Today' },
  { value: 'current', label: 'Current' },
  { value: 'upcoming', label: 'Upcoming Next' },
];

interface CelebrationsProps {
  user: User | null;
}

type CelebrationType = 'birthday' | 'anniversary' | 'baptism_anniversary';
type PeriodType = 'week' | 'month';
type WindowType = 'current' | 'upcoming' | 'today';

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

  // Today's celebrations state
  const [todayBirthdays, setTodayBirthdays] = useState<CelebrationItem[]>([]);
  const [todayAnniversaries, setTodayAnniversaries] = useState<CelebrationItem[]>([]);
  const [todayBaptismAnniversaries, setTodayBaptismAnniversaries] = useState<CelebrationItem[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);

  // Fetch today's celebrations on mount
  useEffect(() => {
    const fetchToday = async () => {
      setTodayLoading(true);
      try {
        const [bRes, aRes, baRes] = await Promise.all([
          apiFetch(`/api/members/celebrations?type=birthday&period=week&window=today`),
          apiFetch(`/api/members/celebrations?type=anniversary&period=week&window=today`),
          apiFetch(`/api/members/celebrations?type=baptism_anniversary&period=week&window=today`),
        ]);
        const bData = await bRes.json();
        const aData = await aRes.json();
        const baData = await baRes.json();
        if (bData.success) setTodayBirthdays(bData.data || []);
        if (aData.success) setTodayAnniversaries(aData.data || []);
        if (baData.success) setTodayBaptismAnniversaries(baData.data || []);
      } catch (err) {
        console.error('Failed to fetch today celebrations', err);
      } finally {
        setTodayLoading(false);
      }
    };
    fetchToday();
  }, []);

  // Fetch filtered celebrations
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
        const res = await apiFetch(`/api/members/celebrations?${params.toString()}`);
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
    if (type === 'baptism_anniversary') return 'Baptism Anniversaries';
    return 'Wedding Anniversaries';
  }, [type]);

  const todayAll = [...todayBirthdays, ...todayAnniversaries, ...todayBaptismAnniversaries];
  const hasTodayCelebrations = todayAll.length > 0;

  const isToday = (dateStr: string) => {
    const today = new Date();
    const d = new Date(dateStr + 'T00:00:00');
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

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

      {/* Today's Celebrations Banner */}
      {!todayLoading && (
        <div
          className={`relative overflow-hidden rounded-2xl border ${
            hasTodayCelebrations
              ? 'bg-gradient-to-r from-rose-50 via-amber-50 to-violet-50 border-rose-200 dark:from-rose-500/10 dark:via-amber-500/10 dark:to-violet-500/10 dark:border-rose-500/20'
              : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
          } p-5 sm:p-6`}
        >
          {/* Decorative sparkles */}
          {hasTodayCelebrations && (
            <>
              <div className="absolute top-2 right-4 text-amber-400 opacity-60 animate-pulse">
                <Sparkles size={20} />
              </div>
              <div className="absolute bottom-3 right-12 text-rose-400 opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}>
                <Sparkles size={14} />
              </div>
            </>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-2.5 rounded-xl text-white shadow-lg ${
                hasTodayCelebrations
                  ? 'bg-gradient-to-br from-rose-500 to-amber-500 shadow-rose-500/20'
                  : 'bg-slate-400 shadow-slate-400/20 dark:bg-slate-600'
              }`}
            >
              <PartyPopper size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Today's Celebrations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {hasTodayCelebrations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {todayAll.map((item) => (
                <div
                  key={`today-${item.type}-${item.id}`}
                  className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 rounded-xl p-3 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 ring-2 ring-offset-1 ring-rose-300 dark:ring-rose-500/50">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={`${item.firstName} ${item.lastName}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30">
                        {item.firstName?.[0]}{item.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {item.firstName} {item.lastName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm animate-pulse">
                        {item.type === 'birthday' ? <Gift size={10} /> : item.type === 'baptism_anniversary' ? <Droplet size={10} /> : <Heart size={10} />}
                        TODAY!
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item.milestoneLabel} {item.milestone}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No birthdays or anniversaries today.
            </p>
          )}
        </div>
      )}

      {/* Filter Bar */}
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
            <button
              onClick={() => setType('baptism_anniversary')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-bold transition-colors ${
                type === 'baptism_anniversary'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><Droplet size={14} /> Baptism</span>
            </button>
          </div>

          <div className="flex gap-2">
            <CustomSelect
              value={period}
              onChange={(val) => setPeriod(val as PeriodType)}
              options={periodOptions}
              fullWidth={false}
              className="w-36"
            />

            <CustomSelect
              value={windowFilter}
              onChange={(val) => setWindowFilter(val as WindowType)}
              options={windowOptions}
              fullWidth={false}
              className="w-44"
            />
          </div>
        </div>
      </div>

      {meta && (
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl px-4 py-3 text-sm dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300">
          <span className="inline-flex items-center gap-2 font-medium">
            <CalendarDays size={15} />
            {windowFilter === 'today'
              ? <>{title} for <strong>today</strong></>
              : <>{title} between <strong>{meta.rangeStart}</strong> and <strong>{meta.rangeEnd}</strong></>
            }
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
          {items.map((item) => {
            const isTodayItem = isToday(item.date);
            return (
              <div
                key={`${item.type}-${item.id}-${item.date}`}
                className={`bg-white border rounded-2xl p-4 shadow-sm dark:bg-slate-900 ${
                  isTodayItem
                    ? 'border-rose-300 ring-2 ring-rose-200 dark:border-rose-500/50 dark:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${
                    isTodayItem ? 'ring-2 ring-offset-1 ring-rose-400 dark:ring-rose-500/50' : ''
                  }`}>
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
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {item.date}
                      {isTodayItem && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                          TODAY!
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20">
                    {item.milestoneLabel} {item.milestone}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Celebrations;
