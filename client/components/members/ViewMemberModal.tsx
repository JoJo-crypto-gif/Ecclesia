import React, { useState, useEffect } from 'react';
import {
  Mail, Phone, Printer, User, Megaphone, Briefcase, MessageSquare,
  BarChart3, UserCircle, Loader2, AlertCircle, MapPin, GraduationCap,
  Heart, Users, Award, FileText, Calendar, Copy, Check, X
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Cell
} from 'recharts';
import Modal from '../Modal';
import { Member, Zone, MemberStatus, MemberChild } from '../../types';
import { useData } from '../../context/DataContext';
import { getMemberDisplayName, getMemberTitles } from '../../utils/memberName';
import { formatOccupation, parseOccupation } from '../../utils/occupation';
import { apiFetch } from '../../utils/api';

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

// ─── Copy Button Helper ──────────────────────────────────
const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all active:scale-90 focus:outline-none shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check size={11} className="text-emerald-500 dark:text-emerald-400 animate-scale-in" />
      ) : (
        <Copy size={11} />
      )}
    </button>
  );
};

// ─── Info Tab ────────────────────────────────────────────
const InfoTab: React.FC<{ member: Member; zones: Zone[]; onOpenIdCard: (m: Member) => void }> = ({ member, zones, onOpenIdCard }) => {
  const occ = parseOccupation(member.occupation);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  const [startRect, setStartRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [isFullyOpen, setIsFullyOpen] = useState(false);

  useEffect(() => {
    if (isAvatarExpanded) {
      // Trigger the opening zoom on next frame
      const raf = requestAnimationFrame(() => {
        setIsFullyOpen(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsFullyOpen(false);
    }
  }, [isAvatarExpanded]);

  const handleAvatarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!member.avatarUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setStartRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });
    setIsAvatarExpanded(true);
  };

  const handleClose = () => {
    setIsFullyOpen(false);
    // Unmount the component after the transition completes
    setTimeout(() => {
      setIsAvatarExpanded(false);
    }, 500);
  };

  return (
    <div className="p-6 space-y-6 animate-enter">
      {/* ─── Profile Header (Hero Card) ────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 shadow-sm">
        {/* Background Radial Glow */}
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/0 dark:from-indigo-500/5 dark:to-transparent blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          {/* Avatar frame */}
          <div 
            onClick={handleAvatarClick}
            className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-md flex-shrink-0 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 ${member.avatarUrl ? 'cursor-zoom-in hover:scale-[1.04] hover:border-indigo-400 active:scale-95 transition-all duration-300 ease-out' : ''}`}
            title={member.avatarUrl ? "Click to expand photo" : undefined}
          >
            {member.avatarUrl ? (
              <img src={member.avatarUrl} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                <User size={40} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {getMemberDisplayName(member)}
            </h2>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2.5">
              <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 px-2.5 py-0.5 border border-indigo-100 rounded-md text-[10px] font-bold uppercase tracking-wider">
                {member.role || 'Member'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeStyles(member.status)}`}>
                {member.status}
              </span>
            </div>

            {member.status === MemberStatus.ExMember && member.exMemberReason && (
              <div className="mt-3 bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-2 dark:bg-rose-500/5 dark:border-rose-500/10 block">
                <span className="text-[9px] uppercase font-bold text-rose-400 block mb-0.5">Reason for leaving</span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">{member.exMemberReason}</span>
              </div>
            )}

            {/* Quick Action Pill Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mt-6">
              {member.phone && (
                <div className="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-lg text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                  <a
                    href={`tel:${member.phone}`}
                    className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-0.5"
                    title="Click to call directly"
                  >
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span className="font-mono">{member.phone}</span>
                  </a>
                  <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />
                  <CopyButton value={member.phone} />
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-lg text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors max-w-full">
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-0.5 min-w-0 truncate"
                    title="Click to send email directly"
                  >
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="font-sans font-medium truncate">{member.email}</span>
                  </a>
                  <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />
                  <CopyButton value={member.email} />
                </div>
              )}
              {member.whatsapp && (
                <div className="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-lg text-xs font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 shadow-xs hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-colors">
                  <a
                    href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors py-0.5"
                    title="Message on WhatsApp directly"
                  >
                    <MessageSquare size={12} className="text-emerald-500 shrink-0" />
                    <span className="font-mono">{member.whatsapp}</span>
                  </a>
                  <div className="w-px h-3 bg-emerald-200/60 dark:bg-emerald-800/60 mx-0.5 shrink-0" />
                  <CopyButton value={member.whatsapp} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Grid container for Card details ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: Personal Biography */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <UserCircle size={14} className="text-indigo-500 dark:text-indigo-400" />
            Biography
          </h3>
          <div className="space-y-3.5 text-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Titles</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{getMemberTitles(member) || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Other Name(s)</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{member.otherName || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gender</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{member.gender || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Hometown</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{member.homeTown || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Date of Birth & Age</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {member.dob ? (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    {member.dob}
                    <span className="text-slate-400 font-normal">({calculateAge(member.dob)} years)</span>
                  </span>
                ) : <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Discovery Source</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5 mt-0.5">
                <Megaphone size={12} className="text-indigo-400" />
                {member.discoverySource || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: Contact & Residence */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <MapPin size={14} className="text-rose-500 dark:text-rose-400" />
            Contact & Residence
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Residential Address</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium block leading-relaxed">{member.address || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}</span>
              {member.landmark && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-200/40 dark:border-slate-700/40 inline-flex items-center gap-1.5">
                  <span className="font-bold text-indigo-500 dark:text-indigo-400">📍 Landmark:</span>
                  <span>{member.landmark}</span>
                </div>
              )}
            </div>

            {/* Merged Emergency Contact details */}
            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="text-xs font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1 mb-2.5 uppercase tracking-wide">
                <AlertCircle size={12} /> Emergency Contact
              </span>
              <div className="bg-white/60 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-xl p-3 grid grid-cols-2 gap-2 shadow-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Contact Name</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{member.emergencyContact || <span className="text-slate-400 dark:text-slate-600 italic font-normal">Not specified</span>}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Contact Phone</span>
                  {member.emergencyPhone ? (
                    <a href={`tel:${member.emergencyPhone}`} className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5">
                      <Phone size={10} /> {member.emergencyPhone}
                    </a>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-600 italic">Not specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: Education & Career */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <GraduationCap size={14} className="text-amber-500 dark:text-amber-400" />
            Education & Career
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Highest Education</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{member.education || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}</span>
            </div>
            
            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Employment Status</span>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block mb-3 border ${
                occ.status === 'Employed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                occ.status === 'Self-Employed' ? 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20' :
                occ.status === 'Student' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' :
                occ.status === 'Retired' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}>
                {occ.status === 'Retired' ? 'Retired / Pensioner' : (occ.status || 'Not specified')}
              </span>

              {(occ.status === 'Employed' || occ.status === 'Self-Employed') && (occ.role || occ.organization) && (
                <div className="bg-white/60 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-xl p-3 space-y-2.5 shadow-xs">
                  {occ.role && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                        {occ.status === 'Self-Employed' ? 'Profession / Business' : 'Job Title / Role'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{occ.role}</span>
                    </div>
                  )}
                  {occ.organization && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                        {occ.status === 'Self-Employed' ? 'Business Location / Name' : 'Workplace / Employer'}
                      </span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Briefcase size={12} className="text-slate-400 shrink-0" />
                        {occ.organization}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {occ.status === 'Student' && (occ.organization || occ.role || occ.location) && (
                <div className="bg-white/60 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-xl p-3 space-y-2.5 shadow-xs">
                  {occ.organization && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">School Name</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{occ.organization}</span>
                    </div>
                  )}
                  {occ.role && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Course of Study</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{occ.role}</span>
                    </div>
                  )}
                  {occ.location && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">School Location</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        {occ.location}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {occ.status !== 'Employed' && occ.status !== 'Self-Employed' && occ.status !== 'Student' && !occ.role && !occ.organization && (
                <span className="text-xs text-slate-400 dark:text-slate-600 italic block">No career details specified.</span>
              )}
            </div>
          </div>
        </div>

        {/* CARD 4: Church Involvement */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <Award size={14} className="text-indigo-500 dark:text-indigo-400" />
            Church Involvement
          </h3>
          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Assigned Zone</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  {zones.find(z => z.id === member.zoneId)?.name || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Unassigned</span>}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Date Joined</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{member.joinDate || <span className="text-slate-400 dark:text-slate-600 italic text-xs font-normal">Not specified</span>}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Role / Ministry</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{member.role || 'Member'}</span>
            </div>
            {member.interest && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ministry / Role Interest (Church Involvement)</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs leading-relaxed block mt-0.5">{member.interest}</span>
              </div>
            )}
            
            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Baptism Status</span>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block mb-3 border ${
                member.isBaptized
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}>
                {member.isBaptized ? 'Baptized' : 'Not Baptized'}
              </span>

              {member.isBaptized && (
                <div className="relative overflow-hidden bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-500/10 rounded-xl p-3.5 shadow-xs grid grid-cols-2 gap-y-3 gap-x-4">
                  {/* Subtle cross/shield outline graphic */}
                  <div className="absolute right-2 bottom-0 text-[64px] leading-none opacity-5 dark:opacity-[0.03] select-none pointer-events-none font-bold">💧</div>
                  
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-0.5">Baptism Date</span>
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">{member.baptismDate || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-0.5">Officiating Minister</span>
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">{member.baptizedBy || 'Not specified'}</span>
                  </div>
                  <div className="col-span-2 border-t border-indigo-100/30 dark:border-indigo-500/5 pt-2.5">
                    <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-0.5">Baptism Location / Church</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{member.baptismChurch || 'Not specified'}</span>
                  </div>
                  <div className="col-span-2 border-t border-indigo-100/30 dark:border-indigo-500/5 pt-2.5">
                    <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-0.5">Brother's Keeper</span>
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">🛡️ {member.brothersKeeper || 'Not assigned'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 5: Family & Relations */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 md:col-span-2">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <Heart size={14} className="text-indigo-500 dark:text-indigo-400" />
            Family & Relations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left side: Marital details */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Marital Status</span>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    member.maritalStatus === 'Married' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' :
                    member.maritalStatus === 'Single' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}>
                    {member.maritalStatus || 'Not specified'}
                  </span>
                  {member.marriageDate && (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      since {member.marriageDate}
                    </span>
                  )}
                </div>
              </div>

              {member.maritalStatus === 'Married' && (
                <div className="bg-white/60 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-xl p-3.5 shadow-xs space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Spouse Name</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{member.spouseName || <span className="text-slate-400 italic font-normal">Not specified</span>}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Spouse Contact</span>
                      {member.spousePhone ? (
                        <a href={`tel:${member.spousePhone}`} className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5">
                          <Phone size={10} /> {member.spousePhone}
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-600 italic">Not specified</span>
                      )}
                    </div>
                  </div>
                  {member.spouseChurch && (
                    <div className="border-t border-slate-200/50 pt-2.5 dark:border-slate-700/50">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Spouse's Church</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">⛪ {member.spouseChurch}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Parents columns */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">Parents Details</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-xl p-3 shadow-xs">
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 block mb-1">👩 Mother</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate mb-1.5">{member.motherName || <span className="text-slate-400 italic font-normal font-medium">Not specified</span>}</span>
                    {member.motherStatus && (
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                        member.motherStatus === 'Alive' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                        'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                      }`}>
                        {member.motherStatus}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/60 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 rounded-xl p-3 shadow-xs">
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 block mb-1">👨 Father</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate mb-1.5">{member.fatherName || <span className="text-slate-400 italic font-normal font-medium">Not specified</span>}</span>
                    {member.fatherStatus && (
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                        member.fatherStatus === 'Alive' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                        'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                      }`}>
                        {member.fatherStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Children list */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                👶 Children List
                {member.children && member.children.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full dark:bg-amber-500/20 dark:text-amber-400">
                    {member.children.length}
                  </span>
                )}
              </span>
              
              <div className="flex-1 bg-white/40 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-3 min-h-[140px] flex flex-col justify-center">
                {member.children && member.children.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {member.children.map((child: MemberChild, idx: number) => (
                      <div key={idx} className="bg-white dark:bg-slate-900/60 p-2.5 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center gap-3 shadow-xs">
                        <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-100/30">
                          <span className="text-xs">👶</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{child.name}</span>
                            {child.dob && (
                              <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {calculateAge(child.dob)}y
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {child.dob && <span>DOB: {child.dob}</span>}
                            {child.dob && child.phone && <span className="text-slate-300 dark:text-slate-700">•</span>}
                            {child.phone && (
                              <a href={`tel:${child.phone}`} className="text-indigo-600 font-mono dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-semibold">
                                <Phone size={8} /> {child.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-500 italic text-xs">
                    No children recorded
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>

      </div>

      {/* CARD 6: Internal Notes */}
      {member.notes && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <FileText size={14} className="text-indigo-500 dark:text-indigo-400" />
            Internal Notes
          </h3>
          <div className="relative bg-white/60 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-700/40 p-4 rounded-xl text-slate-600 text-xs leading-relaxed italic dark:bg-slate-800/80 dark:text-slate-400 flex gap-3 shadow-xs">
            <MessageSquare size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <span>"{member.notes}"</span>
          </div>
        </div>
      )}

      {/* Generating Card Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => onOpenIdCard(member)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-[0.98] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-sm"
        >
          <Printer size={16} />
          Generate Member ID Card
        </button>
      </div>

      {/* iOS-Style Photo Lightbox Modal */}
      {isAvatarExpanded && member.avatarUrl && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center select-none cursor-zoom-out transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isFullyOpen ? 'bg-slate-950/70 backdrop-blur-xl' : 'bg-slate-950/0 backdrop-blur-[0px]'
          }`}
          onClick={handleClose}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className={`absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 hover:scale-105 active:scale-95 transition-all duration-300 z-[220] flex items-center justify-center shadow-lg ${
              isFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <X size={20} />
          </button>
          
          <div
            className="fixed overflow-hidden border-[6px] border-white/20 shadow-2xl bg-slate-900 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-[210]"
            style={
              isFullyOpen && startRect
                ? {
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(85vw, 420px)',
                    height: 'min(85vw, 420px)',
                    borderRadius: '40px',
                  }
                : startRect
                ? {
                    left: `${startRect.left}px`,
                    top: `${startRect.top}px`,
                    width: `${startRect.width}px`,
                    height: `${startRect.height}px`,
                    borderRadius: '16px',
                    transform: 'none',
                  }
                : {}
            }
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image card itself
          >
            <img
              src={member.avatarUrl}
              className="w-full h-full object-cover select-none pointer-events-none"
              alt="Expanded Profile"
            />
          </div>
        </div>
      )}
    </div>
  );
};

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
        const res = await apiFetch(`/api/attendance/member/${member.id}/analytics`);
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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Details"
      maxWidth="max-w-2xl"
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
