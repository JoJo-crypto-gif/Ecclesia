import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Member, MemberStatus, User as AppUser } from '../types';
import { 
  Search, Plus, Edit2, Trash2, Mail, Phone,
  CheckCircle2, XCircle, User as UserIcon, LayoutGrid, List, CheckSquare, Square, 
  Download, Users, Layers, X, Eye, ChevronLeft, ChevronRight, Filter, FilterX
} from 'lucide-react';
import MemberWizardModal from '../components/members/MemberWizardModal';
import ViewMemberModal from '../components/members/ViewMemberModal';
import IdCardModal from '../components/members/IdCardModal';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import { getMemberDisplayName, getMemberTitles } from '../utils/memberName';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 75, 100, 150, 200, 250];

interface MembersProps {
  user: AppUser | null;
}

const Members: React.FC<MembersProps> = ({ user }) => {
  const { warning: toastWarning } = useToast();
  const { 
    members, zones, stats, loading, 
    pagination, setPage, setLimit, setSearchTerm, setStatusFilter, setZoneFilter, setBaptizedFilter, setGenderFilter,
    addMember, updateMember, deleteMember, bulkUpdateMembers, bulkDeleteMembers 
  } = useData();
  
  // Local UI state
  const [localSearch, setLocalSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeZone, setActiveZone] = useState('All');
  const [activeBaptized, setActiveBaptized] = useState('All');
  const [activeGender, setActiveGender] = useState('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionType, setBatchActionType] = useState<'status' | 'zone' | null>(null);
  const [batchValue, setBatchValue] = useState('');
  
  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const isZoneLeader = user?.role === 'zone_leader';
  const canCreateMember = !isZoneLeader || !!user?.zoneId;
  const leaderZoneName = zones.find(z => z.id === user?.zoneId)?.name || 'Your Zone';

  // --- Search & Filter ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    setSearchTerm(val);
    setPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setActiveStatus(status);
    setStatusFilter(status);
    setPage(1);
  };

  const clearAllFilters = () => {
    setLocalSearch(''); setSearchTerm('');
    setActiveStatus('All'); setStatusFilter('All');
    setActiveZone('All'); setZoneFilter('All');
    setActiveBaptized('All'); setBaptizedFilter('All');
    setActiveGender('All'); setGenderFilter('All');
    setPage(1);
  };

  // --- Helpers ---
  const calculateAge = (dobString?: string): number | null => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getCsvValue = (value: string | undefined) => `"${(value || '').replace(/"/g, '""')}"`;

  // --- Selection ---
  const toggleSelection = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const toggleSelectAll = () => {
    const allSelected = members.length > 0 && members.every(m => selectedIds.has(m.id));
    const s = new Set(selectedIds);
    members.forEach(m => allSelected ? s.delete(m.id) : s.add(m.id));
    setSelectedIds(s);
  };

  const clearSelection = () => setSelectedIds(new Set());

  // --- Batch ---
  const openBatchAction = (type: 'status' | 'zone') => {
    if (isZoneLeader && type === 'zone') return;
    setBatchActionType(type);
    setBatchValue('');
  };

  const handleBatchSubmit = () => {
    if (!batchValue) return;
    const ids = Array.from(selectedIds);
    if (batchActionType === 'status') bulkUpdateMembers(ids, { status: batchValue as MemberStatus });
    else if (batchActionType === 'zone') bulkUpdateMembers(ids, { zoneId: batchValue });
    setBatchActionType(null);
    clearSelection();
  };

  const handleBatchDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} members?`)) {
      bulkDeleteMembers(Array.from(selectedIds));
      clearSelection();
    }
  };

  // --- Export CSV ---
  const handleExportCSV = () => {
    const headers = ["Titles", "First Name", "Other Name", "Last Name", "Email", "Phone", "Status", "Zone", "Role"];
    const csvRows = [
      headers.join(','),
      ...members.map(m => {
        const zoneName = zones.find(z => z.id === m.zoneId)?.name || 'Unassigned';
        return [
          getCsvValue(getMemberTitles(m)),
          getCsvValue(m.firstName),
          getCsvValue(m.otherName),
          getCsvValue(m.lastName),
          getCsvValue(m.email),
          getCsvValue(m.phone),
          getCsvValue(m.status),
          getCsvValue(zoneName),
          getCsvValue(m.role),
        ].join(',');
      })
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Modal Handlers ---
  const handleOpenEditModal = (member?: Member) => { setEditingMember(member || null); setIsEditModalOpen(true); };
  const handleOpenViewModal = (member: Member) => { setViewingMember(member); setIsViewModalOpen(true); };
  const handleOpenIdCard = (member?: Member) => { if (member) setViewingMember(member); setIsViewModalOpen(false); setIsIdCardModalOpen(true); };

  const handleSaveMember = (data: Partial<Member>) => {
    if (isZoneLeader && !user?.zoneId) {
      toastWarning('Your account has no assigned zone. Contact an admin.');
      return;
    }

    const payload = isZoneLeader && user?.zoneId
      ? { ...data, zoneId: user.zoneId }
      : data;

    if (editingMember) updateMember({ ...editingMember, ...payload } as Member);
    else addMember({ ...payload, id: '' } as Member);
    setIsEditModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this member?")) deleteMember(id);
  };

  const getStatusBadgeStyles = (status: MemberStatus) => {
    switch (status) {
      case MemberStatus.Active: return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case MemberStatus.Inactive: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600';
      case MemberStatus.Visitor: return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case MemberStatus.ExMember: return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const allOnPageSelected = members.length > 0 && members.every(m => selectedIds.has(m.id));

  return (
    <div className="space-y-6 animate-enter pb-24 relative">
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-auto flex justify-between items-center sm:block">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Members Directory</h1>
              <p className="text-slate-500 mt-1 dark:text-slate-400 text-xs sm:text-sm">Manage member profiles, roles, and status.</p>
            </div>
          </div>
          <div className="w-full sm:w-auto flex gap-2 sm:gap-3">
            <button onClick={handleExportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700" title="Export current page to CSV">
              <Download size={18} /><span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => handleOpenEditModal()}
              disabled={!canCreateMember}
              title={!canCreateMember ? 'No zone assigned to your account' : undefined}
              className="flex-[2] sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
            >
              <Plus size={20} /><span>{isZoneLeader ? 'Add to My Zone' : 'Add Member'}</span>
            </button>
          </div>
        </div>

        {isZoneLeader && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
            New members you create are automatically assigned to <strong>{leaderZoneName}</strong>.
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="p-2 sm:p-3 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex-shrink-0"><UserIcon size={20} /></div>
            <div className="min-w-0"><div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white truncate">{stats.totalMembers}</div><div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">Total</div></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="p-2 sm:p-3 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex-shrink-0"><CheckCircle2 size={20} /></div>
            <div className="min-w-0"><div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white truncate">{stats.activeMembers}</div><div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">Active</div></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="p-2 sm:p-3 rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 flex-shrink-0"><XCircle size={20} /></div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white truncate">
                {stats.inactiveMembers}
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">Inactive</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 dark:bg-slate-900 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="p-2 sm:p-3 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex-shrink-0"><XCircle size={20} /></div>
            <div className="min-w-0"><div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white truncate">{stats.unbaptizedMembers}</div><div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">Not Baptized</div></div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-2 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search by name, email..." value={localSearch} onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {/* Admin-only Advanced Filters Toggle */}
            {!isZoneLeader && (
              <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all whitespace-nowrap ${showAdvancedFilters ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                <Filter size={16} /> Advanced
              </button>
            )}
            
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              {['All', MemberStatus.Active, MemberStatus.Visitor, MemberStatus.Inactive].map(s => (
                <button key={s} onClick={() => handleStatusFilterChange(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeStatus === s ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`} title="List View"><List size={18} /></button>
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`} title="Grid View"><LayoutGrid size={18} /></button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && !isZoneLeader && (
          <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 animate-enter">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Zone</label>
                <CustomSelect
                  value={activeZone}
                  onChange={value => { setActiveZone(value); setZoneFilter(value); setPage(1); }}
                  options={[
                    { value: 'All', label: 'All Zones' },
                    ...zones.map(z => ({ value: z.id, label: z.name }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Baptism Status</label>
                <CustomSelect
                  value={activeBaptized}
                  onChange={value => { setActiveBaptized(value); setBaptizedFilter(value); setPage(1); }}
                  options={[
                    { value: 'All', label: 'Any' },
                    { value: 'Baptized', label: 'Baptized' },
                    { value: 'Not Baptized', label: 'Not Baptized' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Gender</label>
                <CustomSelect
                  value={activeGender}
                  onChange={value => { setActiveGender(value); setGenderFilter(value); setPage(1); }}
                  options={[
                    { value: 'All', label: 'Any' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' }
                  ]}
                />
              </div>
            </div>
            
            {/* Active Filter Chips */}
            {(activeZone !== 'All' || activeBaptized !== 'All' || activeGender !== 'All') && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 mr-1">Active:</span>
                {activeZone !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold dark:bg-indigo-500/20 dark:text-indigo-300">
                    Zone: {zones.find(z => z.id === activeZone)?.name || 'Unknown'}
                    <button onClick={() => { setActiveZone('All'); setZoneFilter('All'); setPage(1); }} className="hover:text-indigo-900 dark:hover:text-indigo-100"><X size={12} /></button>
                  </span>
                )}
                {activeBaptized !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-500/20 dark:text-emerald-300">
                    {activeBaptized}
                    <button onClick={() => { setActiveBaptized('All'); setBaptizedFilter('All'); setPage(1); }} className="hover:text-emerald-900 dark:hover:text-emerald-100"><X size={12} /></button>
                  </span>
                )}
                {activeGender !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-bold dark:bg-amber-500/20 dark:text-amber-300">
                    Gender: {activeGender}
                    <button onClick={() => { setActiveGender('All'); setGenderFilter('All'); setPage(1); }} className="hover:text-amber-900 dark:hover:text-amber-100"><X size={12} /></button>
                  </span>
                )}
                <button onClick={() => { setActiveZone('All'); setZoneFilter('All'); setActiveBaptized('All'); setBaptizedFilter('All'); setActiveGender('All'); setGenderFilter('All'); setPage(1); }} className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 dark:text-slate-400 dark:hover:text-slate-200">
                  <FilterX size={14} /> Clear Advanced
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center dark:bg-slate-900 dark:border-slate-800">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500">Loading members...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500 flex flex-col items-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:bg-slate-800"><Search size={32} /></div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No members found</h3>
          <p className="max-w-xs mx-auto mt-2 text-sm">Try adjusting your search or filters.</p>
          <button onClick={clearAllFilters} className="mt-6 text-indigo-600 font-semibold text-sm hover:underline dark:text-indigo-400">Clear all filters</button>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50/50 text-slate-700 font-bold uppercase tracking-wider text-xs border-b border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 w-4">
                        <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          {allOnPageSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                        </button>
                      </th>
                      <th className="px-6 py-4 pl-4">Member Info</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Zone & Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {members.map(member => (
                      <tr key={member.id} onClick={() => handleOpenViewModal(member)}
                        className={`cursor-pointer hover:bg-slate-50 transition-colors group dark:hover:bg-slate-800/50 ${selectedIds.has(member.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleSelection(member.id)} className="text-slate-300 hover:text-indigo-600 transition-colors">
                            {selectedIds.has(member.id) ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                          </button>
                        </td>
                        <td className="px-6 py-4 pl-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random&color=fff`} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm dark:border-slate-700" />
                              <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${member.status === MemberStatus.Active ? 'bg-emerald-500' : member.status === MemberStatus.Inactive ? 'bg-slate-400' : member.status === MemberStatus.ExMember ? 'bg-rose-500' : 'bg-amber-500'} dark:border-slate-800`}></div>
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">{getMemberDisplayName(member)}</div>
                              <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                                {member.dob ? `${calculateAge(member.dob)} yrs old • ` : ''}
                                Joined {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Mail size={14} className="text-slate-400" /><span>{member.email}</span></div>
                            <div className="flex items-center gap-2 text-slate-500 text-xs dark:text-slate-400"><Phone size={12} className="text-slate-400" /><span>{member.phone}</span></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {zones.find(z => z.id === member.zoneId) ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 w-fit dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                                {zones.find(z => z.id === member.zoneId)?.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs dark:text-slate-500">Unassigned</span>
                            )}
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{member.role || 'Member'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeStyles(member.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${member.status === MemberStatus.Active ? 'bg-emerald-500' : member.status === MemberStatus.Inactive ? 'bg-slate-500' : member.status === MemberStatus.ExMember ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right pr-8">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); handleOpenViewModal(member); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors dark:hover:bg-slate-800 dark:hover:text-indigo-400" title="View"><Eye size={16} /></button>
                            <button onClick={e => { e.stopPropagation(); handleOpenEditModal(member); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors dark:hover:bg-slate-800 dark:hover:text-indigo-400" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(member.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-slate-800 dark:hover:text-red-400" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Member Cards View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {members.map(member => (
                  <div key={member.id} className={`p-4 active:bg-slate-50 transition-colors dark:active:bg-slate-800/50 relative ${selectedIds.has(member.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => handleOpenViewModal(member)}>
                    <div className="flex items-center gap-4">
                      {/* Avatar with Checkbox Layer */}
                      <div className="relative group/check" onClick={e => { e.stopPropagation(); toggleSelection(member.id); }}>
                        <div className={`absolute -top-1 -left-1 z-10 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-all ${selectedIds.has(member.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white opacity-0 group-hover/check:opacity-100 dark:bg-slate-700'}`}>
                          {selectedIds.has(member.id) ? <CheckSquare size={12} className="text-white" /> : <Square size={12} className="text-slate-300" />}
                        </div>
                        <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random&color=fff`} className="w-14 h-14 rounded-2xl object-cover" alt="" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="font-bold text-slate-900 truncate dark:text-white">{getMemberDisplayName(member)}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadgeStyles(member.status)}`}>{member.status}</span>
                        </div>
                        <div className="text-xs text-indigo-600 font-medium mb-2 dark:text-indigo-400">{member.role || 'Member'}</div>
                        <div className="flex flex-wrap items-center gap-y-2 text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="flex items-center gap-1"><Layers size={12} /> {zones.find(z => z.id === member.zoneId)?.name || 'Unassigned'}</span>
                          <div className="flex items-center gap-4 ml-auto">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(member); }} className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 active:scale-95 transition-transform">
                              <Edit2 size={12} /> Edit
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }} className="flex items-center gap-1 font-bold text-red-500 active:scale-95 transition-transform">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {members.map(member => (
                <div key={member.id}
                  className={`bg-white rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden dark:bg-slate-900 dark:hover:shadow-none dark:hover:border-slate-700 ${selectedIds.has(member.id) ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-100 dark:border-slate-800'}`}>
                  <button onClick={() => toggleSelection(member.id)} className={`absolute top-3 left-3 z-10 p-1.5 rounded-lg bg-white/80 backdrop-blur-sm transition-all shadow-sm ${selectedIds.has(member.id) ? 'text-indigo-600 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}>
                    {selectedIds.has(member.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => handleOpenEditModal(member)} className="p-1.5 bg-white/20 backdrop-blur-sm hover:bg-white text-white hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(member.id)} className="p-1.5 bg-white/20 backdrop-blur-sm hover:bg-white text-white hover:text-red-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-0 relative">
                    <div className="flex justify-between items-end -mt-10 mb-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md dark:bg-slate-900">
                          <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random&color=fff`} className="w-full h-full rounded-xl object-cover" alt="" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 border-white rounded-full ${member.status === MemberStatus.Active ? 'bg-emerald-500' : member.status === MemberStatus.Inactive ? 'bg-slate-400' : member.status === MemberStatus.ExMember ? 'bg-rose-500' : 'bg-amber-500'} dark:border-slate-900`}></div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeStyles(member.status)}`}>{member.status}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight dark:text-white">{getMemberDisplayName(member)}</h3>
                      <p className="text-indigo-600 font-medium text-sm mb-4 dark:text-indigo-400">{member.role || 'Member'}</p>
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400"><Mail size={14} className="mr-2 opacity-70" /><span className="truncate">{member.email}</span></div>
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400"><UserIcon size={14} className="mr-2 opacity-70" /><span>{member.dob ? `${calculateAge(member.dob)} years old` : 'Age not set'}</span></div>
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400"><CheckCircle2 size={14} className="mr-2 opacity-70" /><span className="truncate">{zones.find(z => z.id === member.zoneId)?.name || 'No Zone'}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenViewModal(member)} className="flex-1 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800">Profile</button>
                        <button onClick={() => handleOpenIdCard(member)} className="flex-1 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400">ID Card</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ PAGINATION CONTROLS ═══ */}
          {/* ═══ PAGINATION CONTROLS ═══ */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="hidden sm:flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>Rows:</span>
              <CustomSelect
                value={pagination.limit}
                onChange={value => { setLimit(Number(value)); setPage(1); }}
                options={PAGE_SIZE_OPTIONS.slice(0, 5).map(size => ({ value: size, label: String(size) }))}
                fullWidth={false}
                className="w-20"
              />
              <span className="text-slate-400">|</span>
              <span>
                <strong className="text-slate-700 dark:text-slate-200">{pagination.offset + 1}</strong>–<strong className="text-slate-700 dark:text-slate-200">{Math.min(pagination.offset + pagination.limit, pagination.total)}</strong> of {pagination.total}
              </span>
            </div>
            
            {/* Simple Mobile Pagination */}
            <div className="sm:hidden text-xs font-bold text-slate-500 flex items-center gap-2">
              <span className="w-12 h-1 overflow-hidden bg-slate-100 rounded-full dark:bg-slate-800">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(pagination.currentPage / pagination.totalPages) * 100}%` }}></div>
              </span>
              PAGE {pagination.currentPage} / {pagination.totalPages}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button disabled={pagination.currentPage <= 1} onClick={() => setPage(pagination.currentPage - 1)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-bold dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300">
                <ChevronLeft size={18} /> Prev
              </button>
              <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => setPage(pagination.currentPage + 1)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-bold dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300">
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* FLOATING BATCH ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white pl-4 sm:pl-6 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-2 sm:gap-6 z-40 animate-enter border border-slate-700/50 backdrop-blur-md dark:bg-indigo-950 dark:border-indigo-800 max-w-[95vw] overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 pr-3 sm:pr-4 border-r border-white/10 flex-shrink-0">
            <span className="bg-white text-slate-900 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full dark:bg-indigo-400 dark:text-indigo-950">{selectedIds.size}</span>
            <span className="text-[10px] sm:text-sm font-medium text-slate-300 hidden tiny:inline">Selected</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => openBatchAction('status')} className="flex items-center gap-2 px-2.5 sm:px-3 py-2 hover:bg-white/10 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"><Users size={16} /><span className="hidden sm:inline">Status</span></button>
            {!isZoneLeader && (
              <button onClick={() => openBatchAction('zone')} className="flex items-center gap-2 px-2.5 sm:px-3 py-2 hover:bg-white/10 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"><Layers size={16} /><span className="hidden sm:inline">Zone</span></button>
            )}
            <button onClick={handleBatchDelete} className="flex items-center gap-2 px-2.5 sm:px-3 py-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"><Trash2 size={16} /><span className="hidden sm:inline">Delete</span></button>
          </div>
          <button onClick={clearSelection} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors flex-shrink-0"><X size={18} /></button>
        </div>
      )}

      {/* BATCH ACTION MODAL */}
      <Modal isOpen={!!batchActionType} onClose={() => setBatchActionType(null)} title={batchActionType === 'status' ? 'Bulk Change Status' : 'Bulk Assign Zone'} maxWidth="max-w-sm">
        <div className="p-6">
          <p className="text-slate-500 text-sm mb-4 dark:text-slate-400">Apply this change to <strong className="text-slate-900 dark:text-white">{selectedIds.size}</strong> selected members.</p>
          {batchActionType === 'status' && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">New Status</label>
              <CustomSelect
                value={batchValue}
                onChange={value => setBatchValue(value)}
                options={[
                  { value: MemberStatus.Active, label: 'Active' },
                  { value: MemberStatus.Inactive, label: 'Inactive' },
                  { value: MemberStatus.Visitor, label: 'Visitor' },
                  { value: MemberStatus.ExMember, label: 'Ex-member' }
                ]}
                placeholder="-- Select Status --"
              />
            </div>
          )}
          {batchActionType === 'zone' && !isZoneLeader && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Assign to Zone</label>
              <CustomSelect
                value={batchValue}
                onChange={value => setBatchValue(value)}
                options={zones.map(z => ({ value: z.id, label: z.name }))}
                placeholder="-- Select Zone --"
              />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => setBatchActionType(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800">Cancel</button>
            <button onClick={handleBatchSubmit} disabled={!batchValue} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/30 dark:bg-indigo-500">Apply Changes</button>
          </div>
        </div>
      </Modal>

      {/* Modals */}
      <MemberWizardModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingMember={editingMember}
        onSave={handleSaveMember}
        zones={zones}
        isZoneLocked={isZoneLeader}
        lockedZoneId={user?.zoneId}
        lockedZoneName={leaderZoneName}
      />
      <ViewMemberModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} member={viewingMember} zones={zones} onOpenIdCard={handleOpenIdCard} />
      <IdCardModal isOpen={isIdCardModalOpen} onClose={() => setIsIdCardModalOpen(false)} member={viewingMember} zoneName={zones.find(z => z.id === viewingMember?.zoneId)?.name} />
    </div>
  );
};

export default Members;
