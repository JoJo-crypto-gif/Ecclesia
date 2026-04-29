import React, { useState, useEffect } from 'react';
import { Mail, Phone, Printer, User, Megaphone, Briefcase, MessageSquare, BarChart3, UserCircle, Loader2 } from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Cell
} from 'recharts';
import Modal from '../Modal';
import { Member, Zone, MemberStatus } from '../../types';
import { useData } from '../../context/DataContext';

interface MemberAnalytics {
  totalAttended: number;
  totalPossible: number;
  attendanceRate: number;
  byEventType: { type: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

interface ViewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  zones: Zone[];
  onOpenIdCard: (member: Member) => void;
}

const getStatusBadgeStyles = (status: MemberStatus) => {
  switch (status) {
    case MemberStatus.Active: return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    case MemberStatus.Inactive: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600';
    case MemberStatus.Visitor: return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const calculateAge = (dobString?: string): number | null => {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getRateColor = (rate: number) => {
  if (rate >= 75) return { text: 'text-emerald-500', fill: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' };
  if (rate >= 50) return { text: 'text-amber-500', fill: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' };
  return { text: 'text-rose-500', fill: '#ef4444', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20' };
};

const CHART_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'];

// ─── Info Tab ────────────────────────────────────────────
const InfoTab: React.FC<{ member: Member; zones: Zone[]; onOpenIdCard: (m: Member) => void }> = ({ member, zones, onOpenIdCard }) => (
  <div className="p-6 space-y-8">
    <div className="flex items-start gap-6">
      <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-lg flex-shrink-0 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} className="w-full h-full object-cover" alt="Profile" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <User size={48} />
          </div>
        )}
      </div>
      <div className="flex-1 pt-1">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{member.firstName} {member.lastName}</h2>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
            {member.role || 'Member'}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadgeStyles(member.status)}`}>
            {member.status}
          </span>
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
              <Mail size={14} />
            </div>
            <span className="font-medium">{member.email}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
              <Phone size={14} />
            </div>
            <span className="font-medium">{member.phone}</span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 dark:text-slate-200 dark:border-slate-700">Additional Information</h3>
      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Assigned Zone</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">
            {zones.find(z => z.id === member.zoneId)?.name || 'Unassigned'}
          </span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Date Joined</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">{member.joinDate}</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Gender</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">{member.gender || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Date of Birth & Age</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">
            {member.dob ? (
              <>{member.dob} <span className="text-slate-400 font-normal">({calculateAge(member.dob)} years)</span></>
            ) : 'Not specified'}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-sans">Full Address</span>
          <span className="text-slate-800 font-medium dark:text-slate-200">{member.address || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Occupation</span>
          <div className="flex items-center gap-2 text-slate-800 font-bold dark:text-slate-200">
            <Briefcase size={12} className="text-slate-400" />
            {member.occupation || 'Not specified'}
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">How they heard</span>
          <div className="flex items-center gap-2 text-indigo-600 font-bold dark:text-indigo-400">
            <Megaphone size={12} className="text-indigo-400" />
            {member.discoverySource || 'Not specified'}
          </div>
        </div>
        {member.emergencyContact && (
          <div className="col-span-2 pt-4 border-t border-slate-200 border-dashed mt-2 dark:border-slate-700">
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider block mb-1">Emergency Contact</span>
            <div className="flex justify-between items-center">
              <span className="text-slate-800 font-bold dark:text-slate-200">{member.emergencyContact}</span>
              <span className="text-slate-600 dark:text-slate-400 font-mono">{member.emergencyPhone}</span>
            </div>
          </div>
        )}
        {member.notes && (
          <div className="col-span-2 pt-4 border-t border-slate-200 border-dashed mt-2 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Internal Notes</span>
            <div className="bg-slate-100/50 p-4 rounded-xl text-slate-600 text-sm italic dark:bg-slate-800/80 dark:text-slate-400 flex gap-3">
              <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5" />
              "{member.notes}"
            </div>
          </div>
        )}
      </div>
    </div>

    <div className="flex justify-end pt-2">
      <button
        onClick={() => onOpenIdCard(member)}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-500"
      >
        <Printer size={18} />
        Generate Member ID Card
      </button>
    </div>
  </div>
);

// ─── Attendance Tab ──────────────────────────────────────
const AttendanceTab: React.FC<{ member: Member }> = ({ member }) => {
  const { theme } = useData();
  const isDark = theme === 'dark';
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/attendance/member/${member.id}/analytics`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        if (!cancelled && data.success) {
          setAnalytics(data.data);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAnalytics();
    return () => { cancelled = true; };
  }, [member.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <p>{error || 'No data available'}</p>
      </div>
    );
  }

  const rateColors = getRateColor(analytics.attendanceRate);
  const radialData = [
    { name: 'Rate', value: analytics.attendanceRate, fill: rateColors.fill }
  ];

  return (
    <div className="p-6 space-y-6 animate-enter">
      {/* ── Top row: Radial Gauge + Stat Pills ─────────────── */}
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Radial Gauge */}
        <div className={`flex-1 rounded-2xl border p-5 flex flex-col items-center justify-center ${rateColors.bg} ${rateColors.border}`}>
          <div className="relative w-[160px] h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                barSize={14}
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background={{ fill: isDark ? '#1e293b' : '#f1f5f9' }}
                  dataKey="value"
                  cornerRadius={10}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${rateColors.text}`}>
                {analytics.attendanceRate}%
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                Attendance
              </span>
            </div>
          </div>
        </div>

        {/* Stat Pills */}
        <div className="flex-1 flex flex-col gap-3 justify-center">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Events Attended</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{analytics.totalAttended}</span>
              <span className="text-sm text-slate-400 font-medium">/ {analytics.totalPossible} possible</span>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Events Missed</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{analytics.totalPossible - analytics.totalAttended}</span>
              <span className="text-sm text-slate-400 font-medium">events</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── By Event Type (Horizontal Bar) ─────────────────── */}
      {analytics.byEventType.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">By Event Type</h4>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byEventType} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="type"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 600 }}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(30,41,59,0.3)' : '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #334155' : 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '10px 14px',
                  }}
                  labelStyle={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700 }}
                  itemStyle={{ color: isDark ? '#818cf8' : '#6366f1', fontWeight: 600 }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  barSize={22}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {analytics.byEventType.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Monthly Trend (Area Chart) ─────────────────────── */}
      {analytics.monthlyTrend.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">Last 6 Months</h4>
          <p className="text-xs text-slate-400 mb-4">Monthly attendance trend</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.monthlyTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="memberAttGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #334155' : 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '10px 14px',
                  }}
                  labelStyle={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700 }}
                  itemStyle={{ color: isDark ? '#818cf8' : '#6366f1', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Attendance"
                  stroke="#d946ef"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#fff' }}
                  activeDot={{ r: 7, fill: isDark ? '#0f172a' : '#fff', stroke: '#d946ef', strokeWidth: 3 }}
                  fillOpacity={1}
                  fill="url(#memberAttGrad)"
                  animationDuration={1500}
                  animationBegin={200}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Empty state */}
      {analytics.totalAttended === 0 && (
        <div className="text-center py-8 text-slate-400">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No attendance records yet</p>
          <p className="text-xs mt-1">This member hasn't checked in to any events</p>
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ──────────────────────────────────────────
const ViewMemberModal: React.FC<ViewMemberModalProps> = ({ isOpen, onClose, member, zones, onOpenIdCard }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'attendance'>('info');

  // Reset to info tab when modal opens with a new member
  useEffect(() => {
    if (isOpen) setActiveTab('info');
  }, [isOpen, member?.id]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Details"
      maxWidth="max-w-xl"
    >
      {member && (
        <>
          {/* Tab Switcher */}
          <div className="px-6 pt-4 pb-0">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'info'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <UserCircle size={16} />
                Info
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'attendance'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 size={16} />
                Attendance
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' ? (
            <InfoTab member={member} zones={zones} onOpenIdCard={onOpenIdCard} />
          ) : (
            <AttendanceTab member={member} />
          )}
        </>
      )}
    </Modal>
  );
};

export default ViewMemberModal;
