import React from 'react';
import { Users, Map, Activity, TrendingUp, Calendar, ArrowRight, Shield, UserCheck } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { useData } from '../context/DataContext';
import StatCard from '../components/StatCard';
import { MemberStatus } from '../types';

import { useNavigate } from 'react-router-dom';
import ReportGenerationModal from '../components/reports/ReportGenerationModal';

const Dashboard: React.FC = () => {
  const { stats, members, zones, theme, events } = useData();
  const navigate = useNavigate();
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  
  // Dynamic Trends State
  const [period, setPeriod] = React.useState<'week' | 'month' | 'year'>('month');
  const [selectedEventId, setSelectedEventId] = React.useState<string>('all');
  const [trendData, setTrendData] = React.useState<any[]>([]);

  // Zone Health & Demographics State
  const [zoneHealthData, setZoneHealthData] = React.useState<any[]>([]);
  const [demographicsData, setDemographicsData] = React.useState<any[]>([]);

  // Fetch Zone Health & Demographics on mount
  React.useEffect(() => {
    const fetchInsights = async () => {
      try {
        const [zhRes, demoRes] = await Promise.all([
          fetch('/api/attendance/zone-health', { credentials: 'include' }),
          fetch('/api/attendance/demographics', { credentials: 'include' }),
        ]);
        if (zhRes.ok) {
          const zhData = await zhRes.json();
          if (zhData.success) setZoneHealthData(zhData.data);
        }
        if (demoRes.ok) {
          const demoData = await demoRes.json();
          if (demoData.success) setDemographicsData(demoData.data.filter((d: any) => d.ageGroup !== 'Unknown'));
        }
      } catch (e) {
        console.error('Failed to fetch insights', e);
      }
    };
    fetchInsights();
  }, []);

  // Fetch Trends when filters change
  React.useEffect(() => {
    const fetchTrends = async () => {
        try {
            const query = new URLSearchParams({
                period,
                limit: period === 'year' ? '5' : period === 'week' ? '12' : '12'
            });
            
            if (selectedEventId !== 'all') {
                query.append('eventId', selectedEventId);
            }

            const res = await fetch(`/api/attendance/trends?${query}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setTrendData(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch trends", e);
        }
    };
    
    fetchTrends();
  }, [period, selectedEventId]);

  // Prepare Chart Data
  const memberStatusData = [
    { name: 'Active', value: stats.activeMembers },
    { name: 'Inactive', value: stats.inactiveMembers },
    { name: 'Visitor', value: stats.visitorMembers },
  ];

  const zoneDistributionData = zones.map(zone => ({
    name: zone.name,
    count: members.filter(m => m.zoneId === zone.id).length
  }));


  const discoveryData = stats.discoveryDistribution || [];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#94a3b8'];
  const VIBRANT_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e', '#a855f7'];

  const getEngagementColor = (rate: number) => {
    if (rate >= 75) return '#10b981';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  };
  const isDark = theme === 'dark';

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Dashboard</h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400 text-xs sm:text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="hidden lg:flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
                <Calendar size={16} className="text-indigo-500 dark:text-indigo-400" />
                <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <button 
                onClick={() => setIsReportModalOpen(true)}
                className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 active:scale-95 flex items-center justify-center gap-2 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
            >
            <span>Download Report</span>
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard 
          title="Total Members" 
          value={stats.totalMembers} 
          icon={Users} 
          trend={stats.totalMembersTrend !== undefined ? `${Math.abs(stats.totalMembersTrend)}% vs last mo` : undefined}
          trendUp={stats.totalMembersTrend !== undefined ? stats.totalMembersTrend >= 0 : undefined}
          color="indigo"
          delay="delay-0"
        />
        <StatCard 
          title="Active Zones" 
          value={stats.totalZones} 
          icon={Map} 
          color="blue"
          delay="delay-100"
        />
        <StatCard 
          title="Active Members" 
          value={stats.activeMembers} 
          icon={Activity} 
          trend={stats.activeMembersTrend !== undefined ? `${Math.abs(stats.activeMembersTrend)}% vs last mo` : undefined}
          trendUp={stats.activeMembersTrend !== undefined ? stats.activeMembersTrend >= 0 : undefined}
          color="green"
          delay="delay-200"
        />
        <StatCard 
          title="Avg. Attendance" 
          value={stats.avgAttendance !== undefined ? `${stats.avgAttendance}%` : "0%"} 
          icon={TrendingUp} 
          color="orange"
          delay="delay-300"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Attendance Trend (Curvy Area Chart) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-100 animate-enter delay-200 dark:bg-slate-900 dark:border-slate-800 group md:hover-3d-card md:preserve-3d">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 transform transition-transform duration-300 md:group-hover:translate-z-4">
             <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Attendance Trends</h3>
                <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">
                    {period === 'week' ? 'Weekly' : period === 'year' ? 'Yearly' : 'Monthly'} attendance 
                    {selectedEventId === 'all' ? ' for all events' : ` for ${events.find(e => e.id === selectedEventId)?.name}`}
                </p>
             </div>
             
             <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Event Selector */}
                <select 
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="flex-1 sm:flex-initial bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                    <option value="all">All Events</option>
                    {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                </select>

                {/* Period Tabs */}
                <div className="flex-1 sm:flex-initial flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {(['week', 'month', 'year'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`flex-1 sm:flex-initial px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all ${
                                period === p 
                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
             </div>
          </div>
          <div className="h-[220px] sm:h-[300px] w-full transform transition-transform duration-300 md:group-hover:translate-z-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500}} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500}} 
                />
                <Tooltip 
                  cursor={{stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4'}}
                  contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#fff', 
                      borderRadius: '12px', 
                      border: isDark ? '1px solid #334155' : 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px',
                  }}
                  labelStyle={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, marginBottom: '4px' }}
                  itemStyle={{ color: isDark ? '#818cf8' : '#6366f1', fontWeight: 600 }}
                />
                <Area 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }}
                    fillOpacity={1} 
                    fill="url(#colorAttendance)" 
                    animationDuration={1500}
                    animationBegin={200}
                    animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Status Pie Chart */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 animate-enter delay-300 dark:bg-slate-900 dark:border-slate-800 group md:hover-3d-card md:preserve-3d">
          <div className="transform transition-transform duration-300 md:group-hover:translate-z-4">
             <h3 className="text-lg font-bold text-slate-800 mb-2 dark:text-white">Member Status</h3>
             <p className="text-xs sm:text-sm text-slate-500 mb-6 dark:text-slate-400">Distribution of membership types</p>
          </div>
          <div className="h-[180px] sm:h-[220px] relative transform transition-transform duration-300 md:group-hover:translate-z-10">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={memberStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="value"
                  cornerRadius={6}
                  stroke={isDark ? "#0f172a" : "#fff"}
                  strokeWidth={2}
                  animationDuration={1000}
                  animationBegin={400}
                >
                  {memberStatusData.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#fff', 
                        borderRadius: '12px', 
                        border: isDark ? '1px solid #334155' : 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                    labelStyle={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700 }}
                    itemStyle={{ color: isDark ? '#818cf8' : '#6366f1', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none transform transition-transform duration-300 group-hover:translate-z-20 group-hover:scale-110">
                <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalMembers}</div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total</div>
            </div>
          </div>
          <div className="space-y-3 mt-6 transform transition-transform duration-300 group-hover:translate-z-4">
            {memberStatusData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                    <span className="text-slate-600 font-medium dark:text-slate-300">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-white">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Charts / Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Zone Distribution Bar Chart */}
            <div className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 animate-enter delay-400 dark:bg-slate-900 dark:border-slate-800 group md:hover-3d-card md:preserve-3d">
            <h3 className="text-lg font-bold text-slate-800 mb-6 dark:text-white transform transition-transform duration-300 md:group-hover:translate-z-4">Members by Zone</h3>
            <div className="h-[200px] sm:h-[250px] transform transition-transform duration-300 md:group-hover:translate-z-2">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneDistributionData} layout="vertical" margin={{ left: -30, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 500}} 
                        width={100}
                    />
                    <Tooltip 
                        cursor={{fill: isDark ? '#1e293b/30' : '#f8fafc'}}
                        contentStyle={{
                            backgroundColor: isDark ? '#1e293b' : '#fff', 
                            borderRadius: '12px', 
                            border: isDark ? '1px solid #334155' : 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        }}
                        labelStyle={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700 }}
                        itemStyle={{ color: isDark ? '#818cf8' : '#6366f1', fontWeight: 600 }}
                    />
                    <Bar 
                        dataKey="count" 
                        fill="#8b5cf6" 
                        radius={[0, 4, 4, 0]} 
                        barSize={24}
                        animationDuration={1200}
                        animationBegin={600}
                        animationEasing="ease-out"
                    />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>

            {/* Discovery Source / Acquisition Channels */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 animate-enter delay-500 dark:bg-slate-900 dark:border-slate-800 group md:hover-3d-card md:preserve-3d">
              <div className="transform transition-transform duration-300 md:group-hover:translate-z-4">
                 <h3 className="text-lg font-bold text-slate-800 mb-2 dark:text-white">Acquisition Channels</h3>
                 <p className="text-xs sm:text-sm text-slate-500 mb-6 dark:text-slate-400">How members heard of us</p>
              </div>
              <div className="h-[180px] sm:h-[220px] relative transform transition-transform duration-300 md:group-hover:translate-z-10">
                 <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={discoveryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={6}
                      dataKey="value"
                      cornerRadius={6}
                      stroke={isDark ? "#0f172a" : "#fff"}
                      strokeWidth={2}
                      animationDuration={1000}
                      animationBegin={800}
                    >
                      {discoveryData.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{
                            backgroundColor: isDark ? '#1e293b' : '#fff', 
                            borderRadius: '12px', 
                            border: isDark ? '1px solid #334155' : 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        }}
                        labelStyle={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700 }}
                        itemStyle={{ color: isDark ? '#818cf8' : '#6366f1', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.totalMembers}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Responses</div>
                </div>
              </div>
            </div>

            {/* Grow Community Card - Design Update */}
            <div className="lg:col-span-1 relative overflow-hidden rounded-3xl animate-enter delay-500 group md:hover-3d-card md:preserve-3d">
                {/* Background Gradient & Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 dark:from-violet-900 dark:via-indigo-900 dark:to-purple-950 transition-colors duration-500"></div>
                
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl transform transition-transform duration-500 group-hover:scale-110"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 opacity-20 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl"></div>
                
                {/* Geometric Pattern Overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                {/* Content Container */}
                <div className="relative z-10 p-6 sm:p-8 h-full flex flex-col justify-between transform transition-transform duration-300 md:group-hover:translate-z-10">
                    <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-semibold text-white mb-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                Community Growth
                            </div>
                            <h2 className="text-xl sm:text-3xl font-bold text-white mb-2 tracking-tight">Grow your community</h2>
                            <p className="text-indigo-100 max-w-md text-xs sm:text-lg leading-relaxed opacity-90">
                                Use our AI tools to organize zone meetings and track members.
                            </p>
                        </div>
                        {/* Decorative Icon */}
                        <div className="hidden sm:block p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 transform rotate-12 transition-transform duration-500 md:group-hover:rotate-6 md:group-hover:scale-110">
                            <Users size={32} className="text-white opacity-90" />
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <button 
                            onClick={() => navigate('/members')}
                            className="w-full sm:w-auto justify-center bg-white text-indigo-700 px-6 py-3.5 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.23)] hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-2"
                        >
                            Add New Member <ArrowRight size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
      </div>

      {/* Insights Row: Zone Health + Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Zone Health Leaderboard */}
        {zoneHealthData.length > 0 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 animate-enter delay-500 dark:bg-slate-900 dark:border-slate-800 group md:hover-3d-card md:preserve-3d">
            <div className="flex items-center gap-3 mb-6 transform transition-transform duration-300 md:group-hover:translate-z-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Zone Health</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Engagement rate over last 3 months</p>
              </div>
            </div>
            <div className="space-y-3 transform transition-transform duration-300 md:group-hover:translate-z-2">
              {zoneHealthData.map((zone, i) => (
                <div key={zone.id} className="group/item">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{zone.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{zone.activeAttendees}/{zone.totalMembers} members</span>
                      <span className="text-sm font-black" style={{ color: getEngagementColor(zone.engagementRate) }}>
                        {zone.engagementRate}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(zone.engagementRate, 100)}%`,
                        background: `linear-gradient(90deg, ${getEngagementColor(zone.engagementRate)}, ${zone.engagementRate >= 75 ? '#06b6d4' : zone.engagementRate >= 50 ? '#f59e0b' : '#ec4899'})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demographics vs. Attendance */}
        {demographicsData.length > 0 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 animate-enter delay-500 dark:bg-slate-900 dark:border-slate-800 group md:hover-3d-card md:preserve-3d">
            <div className="flex items-center gap-3 mb-6 transform transition-transform duration-300 md:group-hover:translate-z-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20">
                <UserCheck size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Attendance by Age</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Engagement rate by demographic (3 months)</p>
              </div>
            </div>
            <div className="h-[250px] transform transition-transform duration-300 md:group-hover:translate-z-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographicsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    {demographicsData.map((_, i) => (
                      <linearGradient key={`demoGrad-${i}`} id={`demoGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                  <XAxis
                    dataKey="ageGroup"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 500 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(30,41,59,0.3)' : '#f8fafc' }}
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      borderRadius: '12px',
                      border: isDark ? '1px solid #334155' : 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px',
                    }}
                    labelStyle={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700 }}
                    formatter={(value: any, _name: any, props: any) => [
                      `${value}% (${props.payload.activeAttendees}/${props.payload.totalMembers})`,
                      'Engagement'
                    ]}
                  />
                  <Bar
                    dataKey="engagementRate"
                    radius={[8, 8, 0, 0]}
                    barSize={36}
                    animationDuration={1200}
                    animationBegin={800}
                    animationEasing="ease-out"
                  >
                    {demographicsData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={`url(#demoGrad-${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>


      <ReportGenerationModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;
