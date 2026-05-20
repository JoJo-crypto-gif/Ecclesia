import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Zone, Member, MemberStatus } from '../types';
import { Plus, Edit2, Trash2, MapPin, Clock, ChevronRight, Search, User, Mail, Phone, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { apiFetch } from '../utils/api';

const Zones: React.FC = () => {
  const { hasPermission } = useAuth();
  const { zones, members, addZone, updateZone, deleteZone, fetchAllMembers } = useData();
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState<Partial<Zone>>({});

  // View Detail State
  const [viewingZone, setViewingZone] = useState<Zone | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [leaderSearch, setLeaderSearch] = useState('');
  const [isLeaderDropdownOpen, setIsLeaderDropdownOpen] = useState(false);
  const leaderDropdownRef = useRef<HTMLDivElement>(null);
  const [leaderLoginEmail, setLeaderLoginEmail] = useState('');
  const [leaderLoginPassword, setLeaderLoginPassword] = useState('');
  const [leaderLoginError, setLeaderLoginError] = useState('');

  const refreshAllMembers = () => {
    let isMounted = true;
    fetchAllMembers()
      .then(data => {
        if (isMounted) setAllMembers(data);
      })
      .catch(() => {
        // Fall back to paginated members if full fetch fails
      });
    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    const cleanup = refreshAllMembers();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAllMembers]);

  useEffect(() => {
    if (!isModalOpen) return;
    const cleanup = refreshAllMembers();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const membersList = allMembers.length ? allMembers : members;

  // Helper to find leader member profile based on leaderId
  const getLeaderMember = (leaderId?: string) => {
    if (!leaderId) return undefined;
    return membersList.find(m => m.id === leaderId);
  };

  const selectedLeader = getLeaderMember(formData.leaderId);
  const selectedLeaderLabel = selectedLeader ? `${selectedLeader.firstName} ${selectedLeader.lastName}` : '';

  useEffect(() => {
    if (!isModalOpen) return;
    setLeaderSearch(selectedLeaderLabel);
  }, [isModalOpen, selectedLeaderLabel]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!leaderDropdownRef.current) return;
      if (!leaderDropdownRef.current.contains(event.target as Node)) {
        setIsLeaderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const maxZonePopulation = useMemo(() => {
    if (zones.length === 0) return 10;
    const counts = zones.map(z => z.memberCount || 0);
    const max = Math.max(...counts);
    return max === 0 ? 10 : max; 
  }, [zones]);

  const handleOpenModal = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData(zone);
    } else {
      setEditingZone(null);
      setFormData({});
    }
    setLeaderLoginEmail('');
    setLeaderLoginPassword('');
    setLeaderLoginError('');
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (zone: Zone) => {
    setViewingZone(zone);
    setMemberSearchTerm('');
    setIsViewModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setLeaderLoginError('');

    const hasLeaderLoginInput = Boolean(leaderLoginEmail || leaderLoginPassword);
    if (hasLeaderLoginInput && !formData.leaderId) {
      setLeaderLoginError('Select a zone leader before setting leader login credentials.');
      return;
    }
    if ((leaderLoginEmail && !leaderLoginPassword) || (!leaderLoginEmail && leaderLoginPassword)) {
      setLeaderLoginError('Provide both leader email and password, or leave both empty.');
      return;
    }

    try {
      let savedZone: Zone | null = null;
      if (editingZone) {
        savedZone = await updateZone({ ...editingZone, ...formData } as Zone);
      } else {
        savedZone = await addZone({ ...formData, id: Date.now().toString() } as Zone);
      }

      if (savedZone && leaderLoginEmail && leaderLoginPassword) {
        const leader = membersList.find(m => m.id === formData.leaderId);
        const res = await apiFetch('/api/users/zone-leader', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: leaderLoginEmail,
            password: leaderLoginPassword,
            memberId: formData.leaderId,
            zoneId: savedZone.id,
            name: leader ? `${leader.firstName} ${leader.lastName}` : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setLeaderLoginError(data?.error?.message || 'Failed to create leader login');
          return;
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      setLeaderLoginError('Failed to save zone');
    }
  };

  const handleDeleteZone = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("Are you sure you want to delete this zone? Members will be unassigned.")) {
          deleteZone(id);
      }
  };

  const handleEditZone = (e: React.MouseEvent, zone: Zone) => {
      e.stopPropagation();
      handleOpenModal(zone);
  };

  // Filter members for the view modal
  const viewZoneMembers = useMemo(() => {
    if (!viewingZone) return [];
    return membersList.filter(m => m.zoneId === viewingZone.id);
  }, [viewingZone, membersList]);

  const filteredViewMembers = useMemo(() => {
    return viewZoneMembers.filter(m => 
        (m.firstName + ' ' + m.lastName).toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(memberSearchTerm.toLowerCase())
    );
  }, [viewZoneMembers, memberSearchTerm]);

  const viewZoneLeader = viewingZone ? getLeaderMember(viewingZone.leaderId) : null;

  const leaderOptions = useMemo(() => {
    const q = leaderSearch.trim().toLowerCase();
    const base = membersList;
    if (!q) return base;
    return base.filter(m => {
      const name = `${m.firstName} ${m.lastName}`.toLowerCase();
      const email = (m.email || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [leaderSearch, membersList]);

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Zones</h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400">Organize your congregation into geographic or functional families.</p>
        </div>
        {hasPermission('zones', 'create') && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
          >
            <Plus size={20} />
            Create Zone
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => {
          const memberCount = zone.memberCount || 0;
          const leaderMember = getLeaderMember(zone.leaderId);
          const leaderLabel = leaderMember ? `${leaderMember.firstName} ${leaderMember.lastName}` : 'Unassigned';
          const saturation = (memberCount / maxZonePopulation) * 100;
          
          return (
            <div 
                key={zone.id} 
                onClick={() => handleOpenViewModal(zone)}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group dark:bg-slate-900 dark:border-slate-800 dark:hover:shadow-none dark:hover:border-slate-700 cursor-pointer"
            >
              <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-5">
                  <div className="relative w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 overflow-hidden">
                    {/* Filling Effect Background */}
                    <div 
                        className="absolute bottom-0 left-0 right-0 bg-indigo-200/50 dark:bg-indigo-400/20 transition-all duration-1000 ease-out"
                        style={{ height: `${Math.max(10, saturation)}%` }}
                    ></div>
                    <MapPin size={24} className="relative z-10" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
                    {hasPermission('zones', 'edit') && (
                      <button onClick={(e) => handleEditZone(e, zone)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors dark:hover:bg-slate-800 dark:hover:text-indigo-400">
                        <Edit2 size={18} />
                      </button>
                    )}
                    {hasPermission('zones', 'delete') && (
                      <button onClick={(e) => handleDeleteZone(e, zone.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-slate-800 dark:hover:text-red-400">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors dark:text-white dark:group-hover:text-indigo-400">{zone.name}</h3>
                <p className="text-sm text-slate-500 mb-6 h-10 line-clamp-2 leading-relaxed dark:text-slate-400">{zone.description}</p>
                
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100 border-dashed dark:border-slate-800">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 dark:text-slate-500">Leader</span>
                        <div className="flex items-center gap-2">
                             {leaderMember?.avatarUrl ? (
                                <img 
                                    src={leaderMember.avatarUrl} 
                                    alt={leaderLabel} 
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                                />
                             ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-xs flex items-center justify-center font-bold text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                    {leaderLabel.charAt(0)}
                                </div>
                             )}
                             <span className="text-sm font-medium text-slate-700 truncate dark:text-slate-300 max-w-[100px]" title={leaderLabel}>{leaderLabel}</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider dark:text-slate-500">Members</span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{memberCount}</span>
                        </div>
                        {/* Member Count Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 dark:bg-slate-800 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${Math.max(5, saturation)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between dark:border-slate-800">
                     <div className="flex items-center text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg dark:bg-slate-800 dark:text-slate-300">
                        <Clock size={14} className="mr-2 text-slate-400 dark:text-slate-400" />
                        <span>{zone.meetingTime || 'TBA'}</span>
                     </div>
                     <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors dark:text-indigo-400 dark:hover:bg-slate-800">
                        <ChevronRight size={20} />
                     </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Add New Zone Card (Empty State) */}
        {hasPermission('zones', 'create') && (
          <button 
              onClick={() => handleOpenModal()}
              className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group h-full min-h-[300px] dark:border-slate-700 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10"
          >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-500 group-hover:shadow-md transition-all mb-4 dark:bg-slate-800 dark:group-hover:bg-slate-700 dark:group-hover:text-indigo-400">
                  <Plus size={32} />
              </div>
              <span className="font-bold text-slate-600 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400">Add New Zone</span>
              <span className="text-sm text-slate-400 mt-1 dark:text-slate-500">Expand your reach</span>
          </button>
        )}
      </div>

      {/* --- CREATE / EDIT MODAL --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingZone ? "Edit Zone Details" : "Create New Zone"}
      >
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Zone Name</label>
            <input 
              type="text" 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="e.g. North Campus"
            />
          </div>
          <div ref={leaderDropdownRef}>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Zone Leader (Optional)</label>
            <div className="relative">
              <input
                type="text"
                value={leaderSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setLeaderSearch(value);
                  setIsLeaderDropdownOpen(true);
                  if (value.trim() === '' || (selectedLeader && value !== selectedLeaderLabel)) {
                    setFormData(prev => ({ ...prev, leaderId: undefined }));
                    setLeaderLoginEmail('');
                  }
                }}
                onFocus={() => setIsLeaderDropdownOpen(true)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                placeholder="Search by name, email, or phone (optional)"
              />
              {selectedLeader && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg dark:bg-slate-700">
                  <img
                    src={selectedLeader.avatarUrl || `https://ui-avatars.com/api/?name=${selectedLeader.firstName}+${selectedLeader.lastName}&background=random`}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Selected
                  </span>
                </div>
              )}

              {isLeaderDropdownOpen && (
                <div className="absolute z-20 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:bg-slate-900 dark:border-slate-700">
                  {leaderOptions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No members found</div>
                  ) : (
                    leaderOptions.map(member => {
                      const label = `${member.firstName} ${member.lastName}`;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, leaderId: member.id }));
                            setLeaderSearch(label);
                            setIsLeaderDropdownOpen(false);
                            if (member.email) {
                              setLeaderLoginEmail(member.email);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <img
                            src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random`}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {member.role || 'Member'}
                              {member.email ? ` • ${member.email}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Leader Login</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Optional: set login for this leader</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={leaderLoginEmail}
                  onChange={e => setLeaderLoginEmail(e.target.value)}
                  disabled={!formData.leaderId}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  placeholder="leader@church.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 dark:text-slate-300">Password</label>
                <input
                  type="password"
                  value={leaderLoginPassword}
                  onChange={e => setLeaderLoginPassword(e.target.value)}
                  disabled={!formData.leaderId}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  placeholder="Set password"
                />
              </div>
            </div>
            {!formData.leaderId && (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Select a zone leader first to enable leader login credentials.
              </div>
            )}
            {leaderLoginError && (
              <div className="mt-3 text-sm text-rose-600 font-semibold dark:text-rose-400">
                {leaderLoginError}
              </div>
            )}
          </div>
           <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Meeting Time</label>
            <input 
              type="text" 
              value={formData.meetingTime || ''} 
              onChange={e => setFormData({...formData, meetingTime: e.target.value})}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="e.g. Wednesdays 7pm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Description</label>
            <textarea 
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none resize-none h-28 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="Briefly describe the area, demographic, or purpose of this zone..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:shadow-none"
            >
              {editingZone ? 'Save Changes' : 'Create Zone'}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- VIEW ZONE DETAILS MODAL --- */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Zone Information"
        maxWidth="max-w-2xl"
      >
        {viewingZone && (
            <div className="flex flex-col max-h-[85vh] sm:h-[70vh]">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800">
                                    {viewingZone.meetingTime || 'TBA'}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{viewingZone.name}</h2>
                            <p className="text-slate-500 mt-1 text-sm dark:text-slate-400">{viewingZone.description}</p>
                        </div>
                    </div>

                    {/* Leader Card */}
                    <div className="mt-6 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                        <div className="relative flex-shrink-0">
                             {viewZoneLeader?.avatarUrl ? (
                                <img src={viewZoneLeader.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm dark:border-slate-600" />
                             ) : (
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-white shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300">
                                    <User size={32} />
                                </div>
                             )}
                             <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm">LEADER</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white text-xl">{viewZoneLeader ? `${viewZoneLeader.firstName} ${viewZoneLeader.lastName}` : 'Unassigned'}</div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 mt-2">
                                {viewZoneLeader?.email && (
                                    <a href={`mailto:${viewZoneLeader.email}`} className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400">
                                        <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center dark:bg-slate-700">
                                            <Mail size={12} />
                                        </div>
                                        <span className="truncate">{viewZoneLeader.email}</span>
                                    </a>
                                )}
                                {viewZoneLeader?.phone && (
                                    <a href={`tel:${viewZoneLeader.phone}`} className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400">
                                        <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center dark:bg-slate-700">
                                            <Phone size={12} />
                                        </div>
                                        <span className="truncate">{viewZoneLeader.phone}</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 dark:bg-slate-900 dark:border-slate-800">
                         <div className="flex items-center gap-2">
                             <h3 className="font-bold text-slate-800 dark:text-white">Members</h3>
                             <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold dark:bg-slate-800 dark:text-slate-400">{viewZoneMembers.length}</span>
                         </div>
                         <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search zone members..." 
                                value={memberSearchTerm}
                                onChange={(e) => setMemberSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-48 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                         </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-2">
                        {filteredViewMembers.length > 0 ? (
                            <div className="space-y-1">
                                {filteredViewMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition-colors dark:hover:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img 
                                                    src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random`} 
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-700"
                                                    alt=""
                                                />
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${member.status === MemberStatus.Active ? 'bg-emerald-500' : member.status === MemberStatus.Inactive ? 'bg-slate-400' : 'bg-amber-500'}`}></div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{member.firstName} {member.lastName}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{member.role || 'Member'}</div>
                                            </div>
                                        </div>
                                        <div>
                                            {member.status === MemberStatus.Active && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>}
                                            {member.status === MemberStatus.Inactive && <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded dark:bg-slate-800 dark:text-slate-400">Inactive</span>}
                                            {member.status === MemberStatus.Visitor && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded dark:bg-amber-900/30 dark:text-amber-400">Visitor</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <Search size={32} className="mb-2 opacity-20" />
                                <p className="text-sm">No members found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};

export default Zones;
