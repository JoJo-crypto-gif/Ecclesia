import React, { useMemo } from 'react';
import { MemberStatus } from '../types';
import { Users, Calendar, Activity, MapPin } from 'lucide-react';
import { useData } from '../context/DataContext';
import { User } from '../types';
import StatCard from '../components/StatCard';

interface ZoneDashboardProps {
  user: User | null;
}

const ZoneDashboard: React.FC<ZoneDashboardProps> = ({ user }) => {
  const { zones, members, events } = useData();

  const zone = useMemo(() => {
    if (!user?.zoneId) return undefined;
    return zones.find(z => z.id === user.zoneId);
  }, [user?.zoneId, zones]);

  const zoneMembers = useMemo(() => {
    if (!user?.zoneId) return [];
    return members.filter(m => m.zoneId === user.zoneId);
  }, [members, user?.zoneId]);

  const memberStats = useMemo(() => ({
    total:    zoneMembers.length,
    active:   zoneMembers.filter(m => m.status === MemberStatus.Active).length,
    inactive: zoneMembers.filter(m => m.status === MemberStatus.Inactive).length,
    visitors: zoneMembers.filter(m => m.status === MemberStatus.Visitor).length,
  }), [zoneMembers]);

  if (!user?.zoneId) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Zone</h1>
        <p className="text-slate-500 mt-2 dark:text-slate-400">You are not assigned to a zone yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight dark:text-white">My Zone Dashboard</h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400">
            {zone ? `${zone.name} · ${zone.meetingTime || 'Meeting time TBD'}` : 'Zone overview'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Members" value={memberStats.total} icon={Users} color="indigo" delay="delay-0" />
        <StatCard title="Active" value={memberStats.active} icon={Activity} color="green" delay="delay-100" />
        <StatCard title="Inactive" value={memberStats.inactive} icon={Activity} color="blue" delay="delay-200" />
        <StatCard title="Visitors" value={memberStats.visitors} icon={Users} color="orange" delay="delay-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recent Members</h3>
          {zoneMembers.length === 0 ? (
            <div className="text-slate-500 dark:text-slate-400">No members assigned yet.</div>
          ) : (
            <div className="space-y-3">
              {zoneMembers.slice(0, 8).map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random`}
                      className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-700"
                      alt=""
                    />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{member.firstName} {member.lastName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{member.role || 'Member'}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{member.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Upcoming Events</h3>
          {events.length === 0 ? (
            <div className="text-slate-500 dark:text-slate-400">No events yet.</div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 6).map(event => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center dark:bg-indigo-500/10 dark:text-indigo-400">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{event.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin size={12} /> {event.location || 'TBA'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoneDashboard;
