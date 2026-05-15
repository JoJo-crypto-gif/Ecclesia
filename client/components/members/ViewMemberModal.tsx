import React, { useState, useEffect } from 'react';
import { Mail, Phone, Printer, User, Megaphone, Briefcase, MessageSquare, BarChart3, UserCircle, Loader2, AlertCircle } from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Cell
} from 'recharts';
import Modal from '../Modal';
import { Member, Zone, MemberStatus, MemberChild } from '../../types';
import { useData } from '../../context/DataContext';
import { getMemberDisplayName, getMemberTitles } from '../../utils/memberName';

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
    case MemberStatus.ExMember: return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
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
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{getMemberDisplayName(member)}</h2>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
            {member.role || 'Member'}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadgeStyles(member.status)}`}>
            {member.status}
          </span>
        </div>
        {member.status === MemberStatus.ExMember && member.exMemberReason && (
          <div className="mt-3 bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-2.5 dark:bg-rose-500/5 dark:border-rose-500/10 inline-block">
            <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">Reason for leaving</span>
            <span className="text-sm font-bold text-rose-700 dark:text-rose-400">{member.exMemberReason}</span>
          </div>
        )}
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
              <Mail size={14} />
            </div>
            <span className="font-medium">{member.email}</span>
          </div>
          <a href={`tel:${member.phone}`} className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-all">
              <Phone size={14} />
            </div>
            <span className="font-medium underline-offset-4">{member.phone}</span>
          </a>
        </div>
      </div>
    </div>

    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 dark:text-slate-200 dark:border-slate-700">Personal Information</h3>
      <div className="grid grid-cols-2 gap-y-5 gap-x-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Titles</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">{getMemberTitles(member) || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Other Name(s)</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">{member.otherName || 'Not specified'}</span>
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
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Full Address</span>
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
      </div>
    </div>

    {/* Church Involvement */}
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 dark:text-slate-200 dark:border-slate-700">Church Involvement</h3>
      <div className="grid grid-cols-2 gap-y-5 gap-x-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Assigned Zone</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">
            {zones.find(z => z.id === member.zoneId)?.name || 'Unassigned'}
          </span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Date Joined</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">{member.joinDate || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Role / Ministry</span>
          <span className="text-slate-800 font-bold dark:text-slate-200">{member.role || 'Member'}</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Baptism Status</span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider inline-block ${
            member.isBaptized
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            {member.isBaptized ? 'Baptized' : 'Not Baptized'}
          </span>
        </div>

        {member.isBaptized && (
          <div className="col-span-2">
            <div className="bg-slate-100/50 p-4 rounded-xl dark:bg-slate-800/80 grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{member.baptismDate || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Method</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{member.baptismMethod || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Minister</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{member.baptizedBy || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Location</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{member.baptismChurch || 'Not specified'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Marital & Spouse Details */}
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 dark:text-slate-200 dark:border-slate-700">Marital Status</h3>
      <div className="flex items-center gap-3 mb-4">
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
          member.maritalStatus === 'Married' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
          member.maritalStatus === 'Single' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
          member.maritalStatus ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
          'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}>
          {member.maritalStatus || 'Not specified'}
        </span>
        {member.marriageDate && (
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            since {member.marriageDate}
          </span>
        )}
      </div>

      {member.maritalStatus === 'Married' && (
        <div className="bg-slate-100/50 p-4 rounded-xl dark:bg-slate-800/80">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Spouse Name</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{member.spouseName || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Spouse Contact</span>
              {member.spousePhone ? (
                <a href={`tel:${member.spousePhone}`} className="text-sm font-medium text-slate-600 dark:text-slate-400 font-mono hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors decoration-indigo-500/30 underline-offset-4">
                  {member.spousePhone}
                </a>
              ) : (
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 font-mono">Not specified</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Family Details — Parents & Children */}
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 dark:text-slate-200 dark:border-slate-700">Family Details</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-100/50 p-3 rounded-xl dark:bg-slate-800/80">
          <span className="text-xs text-slate-500 block mb-0.5 dark:text-slate-400 flex items-center gap-1.5">👩 Mother</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-white">{member.motherName || 'Not specified'}</span>
            {member.motherStatus && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  member.motherStatus === 'Alive' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                  member.motherStatus === 'Deceased' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                  'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                  {member.motherStatus}
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-100/50 p-3 rounded-xl dark:bg-slate-800/80">
          <span className="text-xs text-slate-500 block mb-0.5 dark:text-slate-400 flex items-center gap-1.5">👨 Father</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-white">{member.fatherName || 'Not specified'}</span>
            {member.fatherStatus && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  member.fatherStatus === 'Alive' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                  member.fatherStatus === 'Deceased' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                  'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                  {member.fatherStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3 flex items-center gap-2">
          👶 Children
          {member.children && member.children.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-amber-500/20 dark:text-amber-400">
              {member.children.length}
            </span>
          )}
        </span>
        {member.children && member.children.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {member.children.map((child: MemberChild, idx: number) => (
              <div key={idx} className="bg-slate-100/50 p-3 rounded-xl dark:bg-slate-800/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm">👶</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">{child.name}</span>
                    {child.dob && (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                        {calculateAge(child.dob)}y
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    {child.dob && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Born: {child.dob}
                      </span>
                    )}
                    {child.phone && (
                      <a href={`tel:${child.phone}`} className="text-xs text-indigo-600 font-mono dark:text-indigo-400 hover:underline decoration-indigo-500/30 underline-offset-2">
                        {child.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500 italic">No children recorded</span>
        )}
      </div>
    </div>

    {/* Emergency Contact */}
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
      <h3 className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 dark:border-slate-700 flex items-center gap-2">
        <AlertCircle size={14} /> Emergency Contact
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Contact Name</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{member.emergencyContact || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Contact Phone</span>
          {member.emergencyPhone ? (
            <a href={`tel:${member.emergencyPhone}`} className="text-sm font-medium text-slate-600 dark:text-slate-400 font-mono hover:text-rose-600 dark:hover:text-rose-400 transition-colors decoration-rose-500/30 underline-offset-4">
              {member.emergencyPhone}
            </a>
          ) : (
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 font-mono">Not specified</span>
          )}
        </div>
      </div>
    </div>

    {/* Notes */}
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 dark:text-slate-200 dark:border-slate-700">Internal Notes</h3>
      {member.notes ? (
        <div className="bg-slate-100/50 p-4 rounded-xl text-slate-600 text-sm italic dark:bg-slate-800/80 dark:text-slate-400 flex gap-3">
          <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5" />
          "{member.notes}"
        </div>
      ) : (
        <span className="text-sm text-slate-400 dark:text-slate-500 italic">No notes</span>
      )}
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
