import React, { useEffect, useState, useMemo } from 'react';
import { Search, ShieldAlert, Clock, User, Globe, X, ChevronLeft, ChevronRight, History, Sparkles, Terminal } from 'lucide-react';
import CustomSelect, { SelectOption } from '../components/CustomSelect';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | string;
  module: 'members' | 'zones' | 'events' | 'users' | 'roles' | 'settings' | 'auth' | string;
  record_id: string | null;
  record_name: string | null;
  description: string;
  changes: Record<string, { old: any; new: any }>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
  currentPage: number;
}

const moduleOptions: SelectOption[] = [
  { value: 'all', label: '📁 All Modules' },
  { value: 'auth', label: '🔑 Authentication' },
  { value: 'members', label: '👥 Members' },
  { value: 'zones', label: '🗺️ Zones' },
  { value: 'events', label: '📅 Events' },
  { value: 'users', label: '👤 System Users' },
  { value: 'roles', label: '🛡️ Security Roles' },
  { value: 'settings', label: '⚙️ System Settings' }
];

const actionOptions: SelectOption[] = [
  { value: 'all', label: '⚡ All Action Types' },
  { value: 'CREATE', label: '➕ CREATE' },
  { value: 'UPDATE', label: '✏️ UPDATE' },
  { value: 'DELETE', label: '❌ DELETE' },
  { value: 'LOGIN', label: '🔓 LOGIN' },
  { value: 'LOGOUT', label: '🔒 LOGOUT' }
];

const datePresetOptions: SelectOption[] = [
  { value: 'all', label: '⏱️ All History' },
  { value: 'today', label: '📅 Today' },
  { value: 'week', label: '📅 Last 7 Days' },
  { value: 'month', label: '📅 Last 30 Days' },
  { value: 'custom', label: '📅 Custom Date Range...' }
];

const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 15,
    offset: 0,
    totalPages: 0,
    currentPage: 1,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all'); // all, today, week, month, custom
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Trigger data fetch on filter changes
  useEffect(() => {
    fetchLogs(0);
  }, [search, moduleFilter, actionFilter, datePreset, dateFrom, dateTo]);

  const fetchLogs = async (offsetVal: number) => {
    setLoading(true);
    try {
      let queryParams = new URLSearchParams();
      if (search.trim()) queryParams.append('search', search.trim());
      if (moduleFilter !== 'all') queryParams.append('module', moduleFilter);
      if (actionFilter !== 'all') queryParams.append('action', actionFilter);
      
      // Calculate date filters based on preset
      let effectiveFrom = dateFrom;
      let effectiveTo = dateTo;
      
      if (datePreset !== 'custom') {
        const now = new Date();
        if (datePreset === 'today') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          effectiveFrom = startOfToday.toISOString();
        } else if (datePreset === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          effectiveFrom = sevenDaysAgo.toISOString();
        } else if (datePreset === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          effectiveFrom = thirtyDaysAgo.toISOString();
        }
      } else {
        if (dateFrom) effectiveFrom = new Date(dateFrom).toISOString();
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          effectiveTo = toDate.toISOString();
        }
      }

      if (effectiveFrom) queryParams.append('dateFrom', effectiveFrom);
      if (effectiveTo) queryParams.append('dateTo', effectiveTo);
      
      queryParams.append('limit', '15');
      queryParams.append('offset', offsetVal.toString());

      const res = await apiFetch(`/api/audit-logs?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * pagination.limit;
    fetchLogs(newOffset);
  };

  const getModuleBadgeClass = (mod: string) => {
    switch (mod?.toLowerCase()) {
      case 'auth':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800';
      case 'members':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'zones':
        return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800';
      case 'events':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'users':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800';
      case 'roles':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
      case 'settings':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-800';
    }
  };

  const getActionBadgeClass = (act: string) => {
    switch (act) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'UPDATE':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      case 'LOGIN':
      case 'MFA_VERIFY':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400';
      case 'LOGOUT':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
      default:
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-400';
    }
  };

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  // Human-readable keys map
  const formatFieldLabel = (key: string): string => {
    const mapping: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      otherName: 'Middle/Other Name',
      phone: 'Phone Number',
      email: 'Email Address',
      role: 'User/System Role',
      roleId: 'Security Role ID',
      zoneId: 'Assigned Zone ID',
      gender: 'Gender',
      status: 'Membership Status',
      isBaptized: 'Baptized',
      occupation: 'Employment / Student Details',
      anniversaryTemplate: 'Anniversary Message Template',
      church_name: 'Church Branding Name',
      church_logo: 'Church Custom Logo',
      mfaEnabled: 'Multi-Factor Auth (MFA)',
      name: 'System Display Name',
      permissions: 'Role Permissions Matrix',
      description: 'Description',
    };
    return mapping[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const renderValue = (val: any, fieldKey?: string): React.ReactNode => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-400 italic text-xs">empty</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${val ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
          {val ? 'Enabled' : 'Disabled'}
        </span>
      );
    }

    // Detect encoded images (Base64 data URLs) or designated image fields
    const isImageField = fieldKey === 'avatarUrl' || fieldKey === 'avatar_url' || fieldKey === 'church_logo';
    const isBase64Image = typeof val === 'string' && val.startsWith('data:image/');
    const isImageUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://')) && /\.(jpeg|jpg|gif|png|webp|svg)/i.test(val);

    if (isBase64Image || isImageField || isImageUrl) {
      return (
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 w-fit max-w-full shadow-xs mt-1">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-center shadow-inner">
            <img 
              src={val} 
              alt="Preview" 
              className="w-full h-full object-cover" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }} 
            />
          </div>
          <div className="min-w-0 pr-2">
            <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 block uppercase tracking-wider mb-0.5">Image Resource</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block truncate max-w-[180px]" title={isBase64Image ? 'Base64 Image Data' : val}>
              {isBase64Image ? 'Base64 Encoded Image Data' : val}
            </span>
          </div>
        </div>
      );
    }

    if (typeof val === 'object') {
      try {
        // Check if it's parsed occupation JSON
        if (val.status) {
          return (
            <div className="text-xs space-y-1">
              <div><strong className="text-slate-500 dark:text-slate-400">Status:</strong> {val.status}</div>
              {val.role && <div><strong className="text-slate-500 dark:text-slate-400">Role/Job:</strong> {val.role}</div>}
              {val.organization && <div><strong className="text-slate-500 dark:text-slate-400">Org/School:</strong> {val.organization}</div>}
              {val.location && <div><strong className="text-slate-500 dark:text-slate-400">Location:</strong> {val.location}</div>}
            </div>
          );
        }
        return <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded max-h-32 overflow-y-auto">{JSON.stringify(val, null, 2)}</pre>;
      } catch {
        return <span className="text-xs font-mono">{String(val)}</span>;
      }
    }
    // Check if it's a JSON string representing occupation or other object
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try {
        const parsed = JSON.parse(val);
        if (parsed.status) {
          return renderValue(parsed, fieldKey);
        }
      } catch {}
    }
    return <span className="text-sm break-all">{String(val)}</span>;
  };

  return (
    <div className="space-y-6 relative pb-12">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -z-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-0 -z-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-2xl border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 rounded-2xl text-indigo-400">
              <History size={26} className="animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans">System Audit Logs</h1>
              <p className="text-slate-400 text-xs md:text-sm font-medium">Trace field-level administrative alterations and authorization sequences</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 self-start md:self-auto shadow-inner">
          <Sparkles size={18} className="text-indigo-400" />
          <div className="text-right">
            <div className="text-2xl font-bold text-white leading-none">{pagination.total}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Total Trace Logs</div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="relative z-30 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-xl transition-all duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by Actor or Description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
            />
          </div>

          {/* Module Selector */}
          <div>
            <CustomSelect
              value={moduleFilter}
              onChange={(value) => setModuleFilter(value)}
              options={moduleOptions}
              placeholder="📁 All Modules"
            />
          </div>

          {/* Action Selector */}
          <div>
            <CustomSelect
              value={actionFilter}
              onChange={(value) => setActionFilter(value)}
              options={actionOptions}
              placeholder="⚡ All Action Types"
            />
          </div>

          {/* Date Presets */}
          <div>
            <CustomSelect
              value={datePreset}
              onChange={(value) => {
                setDatePreset(value);
                if (value !== 'custom') {
                  setDateFrom('');
                  setDateTo('');
                }
              }}
              options={datePresetOptions}
              placeholder="⏱️ All History"
            />
          </div>
        </div>

        {/* Conditional Custom Date Picker */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Table Panel */}
      <div className="relative z-10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-semibold text-xs border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Target Record</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <div>Analyzing logs history...</div>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="text-slate-300 dark:text-slate-700" size={36} />
                      <div>No audit records match the current filters.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => handleRowClick(log)}
                    className="hover:bg-indigo-500/[0.02] dark:hover:bg-indigo-500/[0.01] cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-900 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-500/15">
                          {log.actor_name ? log.actor_name[0].toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {log.actor_name || 'System Operator'}
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {log.actor_email || 'automated-task@ecclesia'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${getModuleBadgeClass(log.module)}`}>
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border border-transparent ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.record_name ? (
                        <div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-300 truncate max-w-[120px]">{log.record_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono select-all truncate max-w-[120px]">{log.record_id}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">none</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(log.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(log.created_at).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing Page <span className="text-indigo-600 dark:text-indigo-400">{pagination.currentPage}</span> of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:hover:bg-transparent transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:hover:bg-transparent transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      {isDrawerOpen && selectedLog && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] animate-in fade-in duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[540px] bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-900 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-500 ease-spring">
            {/* Drawer Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-xl" />
              <div className="relative z-10 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border ${getModuleBadgeClass(selectedLog.module)}`}>
                    {selectedLog.module}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${getActionBadgeClass(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <h3 className="text-lg font-bold">Audit Details</h3>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-sm">{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="relative z-10 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 active:scale-95 shadow-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
              {/* Quick Info Grid */}
              <div className="bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-900 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <User size={16} className="text-indigo-500" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Operator</div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {selectedLog.actor_name || 'System Operator'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert size={16} className="text-indigo-500" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Role Access</div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {selectedLog.actor_role || 'automated'}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <Globe size={16} className="text-indigo-500" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">IP Connection</div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {selectedLog.ip_address || 'local'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock size={16} className="text-indigo-500" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Event Time</div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(selectedLog.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedLog.user_agent && (
                  <>
                    <hr className="border-slate-100 dark:border-slate-800" />
                    <div className="flex items-start gap-2.5">
                      <Terminal size={15} className="text-indigo-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Client Context</div>
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 font-mono break-all line-clamp-2" title={selectedLog.user_agent}>
                          {selectedLog.user_agent}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Narrative */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 dark:text-slate-500">Log Narrative</h4>
                <div className="bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] border border-indigo-500/10 rounded-2xl p-4 text-sm font-semibold text-indigo-950 dark:text-indigo-300">
                  {selectedLog.description}
                </div>
              </div>

              {/* Comparative Diffs Panel */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 dark:text-slate-500">Field-level Diffs</h4>
                
                {selectedLog.action === 'CREATE' ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
                      <History size={20} />
                    </div>
                    <div className="text-sm font-bold text-emerald-800 dark:text-emerald-400">New Resource Instantiated</div>
                    <p className="text-xs text-slate-500">This log captures initial instantiation. Below are the key properties saved:</p>
                    <div className="text-left mt-4 space-y-2.5">
                      {(Object.entries(selectedLog.changes || {}) as [string, { old: any; new: any }][]).map(([key, delta]) => (
                        <div key={key} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl shadow-xs">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{formatFieldLabel(key)}</div>
                          <div className="text-xs text-slate-800 dark:text-slate-200">{renderValue(delta.new, key)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedLog.action === 'DELETE' ? (
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
                      <History size={20} />
                    </div>
                    <div className="text-sm font-bold text-rose-800 dark:text-rose-400">Resource Purged</div>
                    <p className="text-xs text-slate-500">This log traces resource deletion. Below are the last captured properties prior to purging:</p>
                    <div className="text-left mt-4 space-y-2.5">
                      {(Object.entries(selectedLog.changes || {}) as [string, { old: any; new: any }][]).map(([key, delta]) => (
                        <div key={key} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl shadow-xs">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{formatFieldLabel(key)}</div>
                          <div className="text-xs text-slate-800 dark:text-slate-200">{renderValue(delta.old, key)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !selectedLog.changes || Object.keys(selectedLog.changes).length === 0 ? (
                  <div className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-2xl p-4 text-center text-xs border border-slate-200 dark:border-slate-800 italic">
                    No field modifications captured in this transaction.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(Object.entries(selectedLog.changes) as [string, { old: any; new: any }][]).map(([key, delta]) => (
                      <div
                        key={key}
                        className="bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-900 rounded-2xl overflow-hidden shadow-xs"
                      >
                        {/* Field Label Header */}
                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {formatFieldLabel(key)}
                        </div>
                        {/* Old vs New Stack */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Old Value */}
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold uppercase tracking-wider">
                              Old Value
                            </span>
                            <div className="bg-rose-500/[0.02] dark:bg-rose-500/[0.005] border border-rose-500/10 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                              {renderValue(delta.old, key)}
                            </div>
                          </div>
                          {/* New Value */}
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                              New Value
                            </span>
                            <div className="bg-emerald-500/[0.02] dark:bg-emerald-500/[0.005] border border-emerald-500/10 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 font-semibold">
                              {renderValue(delta.new, key)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogs;
