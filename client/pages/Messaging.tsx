import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { User, Member, ManualMessagePayload } from '../types';
import CustomSelect from '../components/CustomSelect';
import { 
  MessageSquare, Mail, Smartphone, Users, Send, 
  Bold, Italic, Underline, List, Link as LinkIcon, CheckCircle, Clock, 
  Image as ImageIcon, Table as TableIcon, AlignLeft, AlignCenter, AlignRight, 
  Type, Palette, Highlighter, Strikethrough, Heading, Eraser, LayoutList,
  ChevronDown, Upload, Scaling, RefreshCw, Save, ChevronLeft, ChevronRight, X
} from 'lucide-react';

interface MessagingProps {
  user: User | null;
}

const Messaging: React.FC<MessagingProps> = ({ user }) => {
  const { members, zones, messages, sendMessage, settings, updateSettings, stats, fetchAllMembers } = useData();
  const HISTORY_PAGE_SIZE = 5;
  const isZoneLeader = user?.role === 'zone_leader';
  const canManageTemplates = user?.role === 'admin';

  // Memoized options for filters
  const zoneOptions = useMemo(() => [
    { value: 'all', label: 'All Zones' },
    ...zones.map((z) => ({ value: z.id, label: z.name }))
  ], [zones]);

  const genderOptions = useMemo(() => [
    { value: 'all', label: 'All Genders' },
    { value: 'Male', label: 'Men' },
    { value: 'Female', label: 'Women' }
  ], []);

  const baptismOptions = useMemo(() => [
    { value: 'all', label: 'All Baptism Status' },
    { value: 'true', label: 'Baptized' },
    { value: 'false', label: 'Unbaptized' }
  ], []);
  
  // UI Tabs
  const [activeTab, setActiveTab] = useState<'compose' | 'templates'>('compose');

  // Compose State
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [audienceType, setAudienceType] = useState<'filter' | 'individual'>('filter');
  const [filters, setFilters] = useState({
    zoneId: 'all',
    gender: 'all',
    isBaptized: 'all'
  });
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState(''); // Stores HTML
  
  // Cache all members for client-side filtering and autocomplete
  const [cachedMembers, setCachedMembers] = useState<Member[]>([]);
  useEffect(() => {
    fetchAllMembers().then(setCachedMembers);
  }, [fetchAllMembers]);
  
  // Templates State
  const [birthdayTemplate, setBirthdayTemplate] = useState('');
  const [anniversaryTemplate, setAnniversaryTemplate] = useState('');
  const [baptismAnniversaryTemplate, setBaptismAnniversaryTemplate] = useState('');
  const [absenteeTemplate, setAbsenteeTemplate] = useState('');
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [showTemplateSuccess, setShowTemplateSuccess] = useState(false);

  // Initialize templates from settings when loaded
  useEffect(() => {
    if (settings) {
      setBirthdayTemplate(settings.birthday_sms_template || '');
      setAnniversaryTemplate(settings.anniversary_sms_template || '');
      setBaptismAnniversaryTemplate(settings.baptism_anniversary_sms_template || '');
      setAbsenteeTemplate(settings.absentee_sms_template || '');
    }
  }, [settings]);


  // UI State
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  
  // Editor Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed Recipient count for display only.
  const [allMemberCount, setAllMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (isZoneLeader && activeTab === 'templates') {
      setActiveTab('compose');
    }
  }, [isZoneLeader, activeTab]);

  useEffect(() => {
    if (audienceType === 'filter') {
      let filtered = cachedMembers;
      if (isZoneLeader && user?.zoneId) {
        filtered = filtered.filter(m => m.zoneId === user.zoneId);
      } else if (filters.zoneId !== 'all') {
        filtered = filtered.filter(m => m.zoneId === filters.zoneId);
      }
      
      if (filters.gender !== 'all') {
        filtered = filtered.filter(m => m.gender === filters.gender);
      }
      
      if (filters.isBaptized !== 'all') {
        const isBap = filters.isBaptized === 'true';
        filtered = filtered.filter(m => m.isBaptized === isBap);
      }
      setAllMemberCount(filtered.length);
    } else {
      setAllMemberCount(selectedMembers.length);
    }
  }, [audienceType, filters, selectedMembers, cachedMembers, isZoneLeader, user?.zoneId]);

  const searchResults = useMemo(() => {
    if (!memberSearchQuery) return [];
    const query = memberSearchQuery.toLowerCase();
    let searchable = cachedMembers;
    if (isZoneLeader && user?.zoneId) searchable = searchable.filter(m => m.zoneId === user.zoneId);
    searchable = searchable.filter(m => !selectedMembers.some(selected => selected.id === m.id));
    
    return searchable.filter(m => 
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(query) ||
      (m.email && m.email.toLowerCase().includes(query)) ||
      (m.phone && m.phone.includes(query))
    ).slice(0, 5);
  }, [memberSearchQuery, cachedMembers, isZoneLeader, selectedMembers, user?.zoneId]);

  const displayCount = allMemberCount ?? 0;
  const totalHistoryPages = Math.max(1, Math.ceil(messages.length / HISTORY_PAGE_SIZE));

  const paginatedMessages = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return messages.slice(start, start + HISTORY_PAGE_SIZE);
  }, [messages, historyPage]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  const recipientLabel = useMemo(() => {
    if (audienceType === 'individual') {
       if (selectedMembers.length === 0) return 'No members selected';
       const names = selectedMembers.slice(0, 2).map(member => `${member.firstName} ${member.lastName}`);
       return selectedMembers.length > 2
         ? `${names.join(', ')} + ${selectedMembers.length - 2} more`
         : names.join(', ');
    }
    
    // Filter mode labels
    const labels = [];
    if (isZoneLeader) {
       labels.push('My Zone');
    } else if (filters.zoneId !== 'all') {
       labels.push(zones.find(z => z.id === filters.zoneId)?.name || 'Zone');
    }
    
    if (filters.gender !== 'all') labels.push(`${filters.gender}s`);
    if (filters.isBaptized !== 'all') labels.push(filters.isBaptized === 'true' ? 'Baptized' : 'Unbaptized');
    
    if (labels.length === 0) return isZoneLeader ? 'My Zone Members' : 'All Members';
    return labels.join(', ');
  }, [audienceType, filters, selectedMembers, zones, isZoneLeader]);

  const addSelectedMember = (member: Member) => {
    setSelectedMembers(prev => (
      prev.some(selected => selected.id === member.id) ? prev : [...prev, member]
    ));
    setMemberSearchQuery('');
    setIsDropdownOpen(false);
  };

  const removeSelectedMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(member => member.id !== memberId));
  };

  // --- RICH TEXT EDITOR LOGIC ---

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        editorRef.current.focus();
        // Sync content state
        setContent(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const insertImage = (url: string) => {
    if (url) execCmd('insertImage', url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          insertImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const insertTable = () => {
    const tableHTML = `
      <table style="width:100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Header 1</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Cell 1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Cell 2</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Cell 3</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Cell 4</td>
          </tr>
        </tbody>
      </table>
      <p><br/></p>
    `;
    execCmd('insertHTML', tableHTML);
  };

  const createLink = () => {
    const url = prompt('Enter link URL:');
    if (url) execCmd('createLink', url);
  };

  // --- SEND LOGIC ---

  const handleSend = async () => {
    if (!content || content === '<br>') return;
    if (channel === 'email' && !subject) return;
    
    if (audienceType === 'individual' && selectedMembers.length === 0) return;
    if (audienceType === 'filter' && displayCount === 0) return;

    setIsSending(true);
    setSendError(null);

    // Strip HTML for SMS plain text if needed
    const plainText = editorRef.current?.innerText || content.replace(/<[^>]+>/g, '');

    const messagePayload: ManualMessagePayload = {
      subject: channel === 'email' ? subject : undefined,
      content: channel === 'sms' ? plainText : content,
      channel,
      audienceType,
      filters: audienceType === 'filter' ? {
        zoneId: filters.zoneId === 'all' ? undefined : filters.zoneId,
        gender: filters.gender === 'all' ? undefined : filters.gender,
        isBaptized: filters.isBaptized === 'all' ? undefined : (filters.isBaptized === 'true' ? 'true' : 'false')
      } : undefined,
      memberIds: audienceType === 'individual' ? selectedMembers.map(member => member.id) : undefined,
      recipientLabel,
      recipientCount: displayCount
    };

    const result = await sendMessage(messagePayload);
    setIsSending(false);

    if (result && result.success) {
      setShowSuccess(true);
      setHistoryPage(1);
      // Reset form
      setSubject('');
      setContent('');
      setSelectedMembers([]);
      setMemberSearchQuery('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      setSendError(result?.message || 'Failed to send message');
    }
  };

  // --- SAVE TEMPLATES LOGIC ---
  const handleSaveTemplates = async () => {
    if (!canManageTemplates) return;
    setIsSavingTemplates(true);
    const success = await updateSettings({
      birthday_sms_template: birthdayTemplate,
      anniversary_sms_template: anniversaryTemplate,
      baptism_anniversary_sms_template: baptismAnniversaryTemplate,
      absentee_sms_template: absenteeTemplate
    });
    setIsSavingTemplates(false);
    if (success) {
      setShowTemplateSuccess(true);
      setTimeout(() => setShowTemplateSuccess(false), 3000);
    }
  };

  // Utilities
  const stripHtmlLength = (html: string) => {
     return html.replace(/<[^>]+>/g, '').length;
  };

  const hasActiveFilters = (!isZoneLeader && filters.zoneId !== 'all')
    || filters.gender !== 'all'
    || filters.isBaptized !== 'all';

  const resetAudienceFilters = () => {
    setFilters({
      zoneId: 'all',
      gender: 'all',
      isBaptized: 'all',
    });
  };

  const audienceToggleClass = (isActive: boolean) => (
    `inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all ${
      isActive
        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100 dark:bg-slate-700 dark:text-white dark:ring-slate-600'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
    }`
  );

  const filterSelectClass = 'h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
  const textInputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <div className="space-y-8 animate-enter pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Messaging</h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400 text-xs sm:text-sm">Communicate with your congregation via Email or SMS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Editor / Templates */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TABS */}
          <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setActiveTab('compose')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'compose' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Compose Announcement
            </button>
            {canManageTemplates && (
              <button 
                onClick={() => setActiveTab('templates')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'templates' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
              >
                Automated Templates
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden">
             
             {/* COMPONENT: COMPOSE */}
             {activeTab === 'compose' && (
                 <div className="animate-enter">
                   {showSuccess && (
                       <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center dark:bg-slate-900/90 animate-enter">
                           <div className="text-center">
                               <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-emerald-900/30 dark:text-emerald-400">
                                   <CheckCircle size={32} />
                               </div>
                               <h3 className="text-xl font-bold text-slate-900 dark:text-white">Message Sent!</h3>
                               <p className="text-slate-500 dark:text-slate-400">Your message has been queued for delivery.</p>
                           </div>
                       </div>
                   )}

                   <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                       <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(240px,0.95fr)_minmax(0,1.45fr)]">
                           <div className="space-y-3">
                               <div className="flex items-center justify-between gap-3">
                                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Channel</label>
                                   <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                       {channel === 'email' ? 'Rich formatting enabled' : 'Plain text delivery'}
                                   </span>
                               </div>
                               <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                                   <button 
                                      onClick={() => setChannel('email')}
                                      className={audienceToggleClass(channel === 'email')}
                                   >
                                       <Mail size={16} /> Email
                                   </button>
                                   <button 
                                      onClick={() => setChannel('sms')}
                                      className={audienceToggleClass(channel === 'sms')}
                                   >
                                       <Smartphone size={16} /> SMS
                                   </button>
                               </div>
                               <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900">
                                   <div className="flex items-start justify-between gap-3">
                                       <div>
                                           <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Audience Preview</p>
                                           <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{recipientLabel}</p>
                                           <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recipient count updates as you change the targeting rules.</p>
                                       </div>
                                       <div className="inline-flex h-11 min-w-[68px] items-center justify-center gap-2 rounded-xl bg-indigo-50 px-3 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                           <Users size={15} />
                                           {displayCount}
                                       </div>
                                   </div>
                               </div>
                           </div>

                           <div className="space-y-3">
                               <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Send To</label>
                                       <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                           {audienceType === 'filter'
                                               ? 'Build a recipient audience with consistent filters.'
                                               : 'Search and add one or more members directly.'}
                                       </p>
                                   </div>
                                   {audienceType === 'filter' && hasActiveFilters && (
                                       <button
                                           type="button"
                                           onClick={resetAudienceFilters}
                                           className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                                       >
                                           <RefreshCw size={14} />
                                           Reset Filters
                                       </button>
                                   )}
                               </div>

                               <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                                   <button 
                                      type="button"
                                      onClick={() => setAudienceType('filter')}
                                      className={audienceToggleClass(audienceType === 'filter')}
                                   >
                                       <Users size={16} />
                                       Target Audience
                                   </button>
                                   <button 
                                      type="button"
                                      onClick={() => setAudienceType('individual')}
                                      className={audienceToggleClass(audienceType === 'individual')}
                                   >
                                       <MessageSquare size={16} />
                                       Specific Individual
                                   </button>
                               </div>

                               {audienceType === 'filter' ? (
                                   <div className="space-y-3 animate-enter">
                                       {isZoneLeader && (
                                           <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                                               Audience is locked to your zone. You can still narrow it further by gender or baptism status.
                                           </div>
                                       )}
                                       <div className={`grid grid-cols-1 gap-3 ${isZoneLeader ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                                          {!isZoneLeader && (
                                              <CustomSelect
                                                  value={filters.zoneId}
                                                  onChange={(value) => setFilters(prev => ({ ...prev, zoneId: value }))}
                                                  options={zoneOptions}
                                              />
                                          )}

                                          <CustomSelect
                                              value={filters.gender}
                                              onChange={(value) => setFilters(prev => ({ ...prev, gender: value }))}
                                              options={genderOptions}
                                          />

                                          <CustomSelect
                                              value={filters.isBaptized}
                                              onChange={(value) => setFilters(prev => ({ ...prev, isBaptized: value }))}
                                              options={baptismOptions}
                                          />
                                       </div>
                                   </div>
                               ) : (
                                   <div className="relative animate-enter">
                                       <div className="flex gap-2">
                                           <div className="relative flex-1">
                                               <input 
                                                   type="text"
                                                   value={memberSearchQuery}
                                                   onChange={(e) => {
                                                       setMemberSearchQuery(e.target.value);
                                                       setIsDropdownOpen(true);
                                                   }}
                                                   onFocus={() => setIsDropdownOpen(true)}
                                                   placeholder="Search member name, email or phone, then add..."
                                                   className={`${textInputClass} ${selectedMembers.length > 0 ? 'pr-28' : ''}`}
                                               />
                                               {selectedMembers.length > 0 && (
                                                   <div className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                       <CheckCircle size={12} /> {selectedMembers.length} selected
                                                   </div>
                                               )}
                                           </div>
                                           {selectedMembers.length > 0 && (
                                               <button 
                                                   type="button"
                                                   onClick={() => {
                                                       setSelectedMembers([]);
                                                       setMemberSearchQuery('');
                                                       setIsDropdownOpen(false);
                                                   }}
                                                   className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                                               >
                                                   <Eraser size={18} />
                                               </button>
                                           )}
                                       </div>

                                       {selectedMembers.length > 0 && (
                                           <div className="mt-3 flex flex-wrap gap-2">
                                               {selectedMembers.map(member => (
                                                   <div
                                                       key={member.id}
                                                       className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                                                   >
                                                       <span className="truncate max-w-[180px]">{member.firstName} {member.lastName}</span>
                                                       <button
                                                           type="button"
                                                           onClick={() => removeSelectedMember(member.id)}
                                                           className="rounded-full text-indigo-500 transition-colors hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-white"
                                                           aria-label={`Remove ${member.firstName} ${member.lastName}`}
                                                       >
                                                           <X size={12} />
                                                       </button>
                                                   </div>
                                               ))}
                                           </div>
                                       )}

                                       {isDropdownOpen && searchResults.length > 0 && (
                                           <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                               {searchResults.map(m => (
                                                   <button
                                                       key={m.id}
                                                       type="button"
                                                       onClick={() => addSelectedMember(m)}
                                                       className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 last:border-0 dark:border-slate-700 dark:hover:bg-slate-700"
                                                   >
                                                       <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                           {m.firstName[0]}{m.lastName[0]}
                                                       </div>
                                                       <div className="min-w-0">
                                                           <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{m.firstName} {m.lastName}</p>
                                                           <p className="truncate text-xs text-slate-500 dark:text-slate-400">{m.email || m.phone || 'No contact info'}</p>
                                                       </div>
                                                   </button>
                                               ))}
                                           </div>
                                       )}
                                       {isDropdownOpen && memberSearchQuery && searchResults.length === 0 && (
                                           <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                               No members found matching "{memberSearchQuery}"
                                           </div>
                                       )}
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>

                   <div className="space-y-4">
                       {/* Subject Line (Email Only) */}
                       {channel === 'email' && (
                           <div className="animate-enter">
                               <input 
                                  type="text" 
                                  value={subject}
                                  onChange={(e) => setSubject(e.target.value)}
                                  placeholder="Email Subject Line"
                                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                               />
                           </div>
                       )}

                       {/* --- RICH TEXT EDITOR CONTAINER --- */}
                       <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all dark:border-slate-700 bg-white dark:bg-slate-950">
                           
                           {/* TOOLBAR */}
                           <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 overflow-x-auto whitespace-nowrap select-none scrollbar-hide">
                               
                               {/* Styles */}
                               <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 dark:border-slate-600 flex-shrink-0">
                                   <ToolbarBtn onClick={() => execCmd('bold')} icon={Bold} label="Bold" />
                                   <ToolbarBtn onClick={() => execCmd('italic')} icon={Italic} label="Italic" />
                                   <ToolbarBtn onClick={() => execCmd('underline')} icon={Underline} label="Underline" />
                               </div>

                               {/* Fonts & Colors */}
                               <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 dark:border-slate-600 flex-shrink-0">
                                   <div className="relative group flex items-center justify-center w-8 h-8 hover:bg-slate-200 rounded dark:hover:bg-slate-700 cursor-pointer overflow-hidden">
                                      <Type size={16} className="text-slate-600 dark:text-slate-300" />
                                      <select onChange={(e) => execCmd('fontName', e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer">
                                          <option value="Arial">Arial</option>
                                          <option value="Georgia">Georgia</option>
                                      </select>
                                   </div>
                                   <div className="relative group flex items-center justify-center w-8 h-8 hover:bg-slate-200 rounded dark:hover:bg-slate-700 cursor-pointer overflow-hidden">
                                      <Scaling size={16} className="text-slate-600 dark:text-slate-300" />
                                      <select onChange={(e) => execCmd('fontSize', e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer">
                                          <option value="2">Small</option>
                                          <option value="3">Normal</option>
                                          <option value="5">Large</option>
                                      </select>
                                   </div>
                               </div>
                               
                               {/* Alignment & Lists */}
                               <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 dark:border-slate-600 flex-shrink-0">
                                   <ToolbarBtn onClick={() => execCmd('justifyLeft')} icon={AlignLeft} label="Align Left" />
                                   <ToolbarBtn onClick={() => execCmd('justifyCenter')} icon={AlignCenter} label="Align Center" />
                                   <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} icon={List} label="Bullet List" />
                               </div>
                           </div>
                           
                           {/* EDITABLE AREA */}
                           <div 
                              ref={editorRef}
                              contentEditable
                              onInput={handleEditorInput}
                              className="w-full p-6 h-80 focus:outline-none overflow-y-auto bg-white text-slate-700 dark:bg-slate-900 dark:text-white prose dark:prose-invert max-w-none font-sans"
                              style={{ minHeight: '320px' }}
                              suppressContentEditableWarning={true}
                           >
                           </div>
                           
                           <div className="bg-slate-50 border-t border-slate-200 p-1.5 flex justify-end px-4 dark:bg-slate-900 dark:border-slate-800">
                               <span className={`text-xs ${channel === 'sms' && stripHtmlLength(content) > 160 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                 {stripHtmlLength(content) || 0} characters {channel === 'sms' && stripHtmlLength(content) > 160 && '(Message will be split into multiple parts)'}
                               </span>
                           </div>
                       </div>
                   </div>

                   {sendError && (
                     <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2 dark:bg-red-900/20 dark:border-red-900/30">
                       <MessageSquare size={16} /> <strong>Error:</strong> {sendError}
                     </div>
                   )}

                   <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 gap-4">
                       <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                           <Users size={16} />
                           <span>Sending to <strong className="text-slate-900 dark:text-white">{displayCount}</strong> recipients</span>
                       </div>
                       
                       <button 
                          onClick={handleSend}
                          disabled={isSending || (!content && !subject) || (audienceType === 'individual' && selectedMembers.length === 0) || displayCount === 0}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600"
                       >
                          {isSending ? (
                              <><RefreshCw size={18} className="animate-spin" /> Sending...</>
                          ) : (
                              <>Send Message <Send size={18} /></>
                          )}
                       </button>
                   </div>
                 </div>
             )}

             {/* COMPONENT: TEMPLATES */}
             {activeTab === 'templates' && canManageTemplates && (
               <div className="animate-enter">
                 {showTemplateSuccess && (
                     <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center dark:bg-slate-900/90 animate-enter rounded-2xl">
                         <div className="text-center">
                             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-emerald-900/30 dark:text-emerald-400">
                                 <CheckCircle size={32} />
                             </div>
                             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Templates Saved!</h3>
                             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your automated messages have been updated.</p>
                         </div>
                     </div>
                 )}

                 {/* Header */}
                 <div className="mb-6">
                   <h3 className="text-base font-bold text-slate-900 dark:text-white">Automated SMS Templates</h3>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Messages sent automatically on a fixed schedule. Use placeholders to personalise.</p>
                   <div className="flex flex-wrap items-center gap-2 mt-3">
                     <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Placeholders:</span>
                     {['[FirstName]', '[LastName]', '[YearsMarried]'].map(tag => (
                       <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-mono font-semibold border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 select-all cursor-pointer hover:bg-indigo-100 transition-colors">
                         {tag}
                       </span>
                     ))}
                   </div>
                 </div>

                 <div className="space-y-5">
                   {/* Birthday Template Card */}
                   <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                     <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-slate-200 dark:from-pink-900/20 dark:to-rose-900/10 dark:border-slate-700">
                       <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center dark:bg-pink-900/30 text-lg">🎂</div>
                         <div>
                           <p className="text-sm font-bold text-slate-900 dark:text-white">Birthday SMS</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400">Personalised birthday greetings</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                         <Clock size={11} /> Daily · 8:00 AM
                       </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900/50">
                       <div className="p-4">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Message Copy</label>
                         <textarea
                           value={birthdayTemplate}
                           onChange={(e) => setBirthdayTemplate(e.target.value)}
                           placeholder="Hi [FirstName], Happy Birthday! 🎉 God bless you this year and always."
                           rows={5}
                           className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 focus:outline-none transition-all text-sm text-slate-800 placeholder-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-500 resize-none leading-relaxed"
                         />
                         <div className="flex items-center justify-between mt-2">
                           <span className="text-xs text-slate-400">Max 160 chars per SMS part</span>
                           <span className={`text-xs font-semibold tabular-nums ${birthdayTemplate.length > 160 ? 'text-amber-500' : birthdayTemplate.length > 130 ? 'text-yellow-500' : 'text-slate-400'}`}>
                             {birthdayTemplate.length}/160
                           </span>
                         </div>
                       </div>
                       <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 dark:text-slate-400">Live Preview</label>
                         <div className="flex flex-col items-start gap-1.5">
                           <span className="text-xs text-slate-400 dark:text-slate-500">From: <strong className="text-slate-600 dark:text-slate-300">ECCLESIA</strong></span>
                           <div className="w-full bg-white dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-slate-100 dark:border-slate-600">
                             <p className="text-sm text-slate-800 dark:text-white leading-relaxed whitespace-pre-wrap break-words min-h-[60px]">
                               {birthdayTemplate
                                 ? birthdayTemplate.replace(/\[FirstName\]/gi, 'Kwame').replace(/\[LastName\]/gi, 'Mensah')
                                 : <span className="text-slate-300 dark:text-slate-500 italic text-xs">Your message preview will appear here as you type...</span>
                               }
                             </p>
                           </div>
                           <span className="text-xs text-slate-300 dark:text-slate-600 italic">Preview uses sample name: Kwame Mensah</span>
                         </div>
                       </div>
                   </div>
                 </div>

                  {/* Anniversary Template Card */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-200 dark:from-amber-900/20 dark:to-orange-900/10 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center dark:bg-amber-900/30 text-lg">💍</div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Wedding Anniversary SMS</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Celebrate married members on their special day</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                        <Clock size={11} /> Daily · 8:10 AM
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900/50">
                      <div className="p-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Message Copy</label>
                        <textarea
                          value={anniversaryTemplate}
                          onChange={(e) => setAnniversaryTemplate(e.target.value)}
                          placeholder="Hi [FirstName], happy wedding anniversary! Wishing you many more blessed years together."
                          rows={5}
                          className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 focus:outline-none transition-all text-sm text-slate-800 placeholder-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-500 resize-none leading-relaxed"
                        />
                        <div className="flex items-center justify-between mt-2">
                           <span className="text-xs text-slate-400">Max 160 chars per SMS part</span>
                           <span className={`text-xs font-semibold tabular-nums ${anniversaryTemplate.length > 160 ? 'text-amber-500' : anniversaryTemplate.length > 130 ? 'text-yellow-500' : 'text-slate-400'}`}>
                             {anniversaryTemplate.length}/160
                           </span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 dark:text-slate-400">Live Preview</label>
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="text-xs text-slate-400 dark:text-slate-500">From: <strong className="text-slate-600 dark:text-slate-300">ECCLESIA</strong></span>
                          <div className="w-full bg-white dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-slate-100 dark:border-slate-600">
                            <p className="text-sm text-slate-800 dark:text-white leading-relaxed whitespace-pre-wrap break-words min-h-[60px]">
                              {anniversaryTemplate
                                ? anniversaryTemplate
                                    .replace(/\[FirstName\]/gi, 'Kojo')
                                    .replace(/\[LastName\]/gi, 'Boateng')
                                    .replace(/\[YearsMarried\]/gi, '12')
                                : <span className="text-slate-300 dark:text-slate-500 italic text-xs">Your message preview will appear here as you type...</span>
                              }
                            </p>
                          </div>
                          <span className="text-xs text-slate-300 dark:text-slate-600 italic">Preview uses sample values: Kojo Boateng, 12 years married</span>
                        </div>
                      </div>
                    </div>
                  </div>

                   {/* Baptism Anniversary Template Card */}
                   <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                     <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-cyan-50 to-teal-50 border-b border-slate-200 dark:from-cyan-900/20 dark:to-teal-900/10 dark:border-slate-700">
                       <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center dark:bg-cyan-900/30 text-lg">💧</div>
                         <div>
                           <p className="text-sm font-bold text-slate-900 dark:text-white">Baptism Anniversary SMS</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400">Celebrate members' baptism milestones</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                         <Clock size={11} /> Daily · 8:20 AM
                       </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900/50">
                       <div className="p-4">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Message Copy</label>
                         <textarea
                           value={baptismAnniversaryTemplate}
                           onChange={(e) => setBaptismAnniversaryTemplate(e.target.value)}
                           placeholder="Hi [FirstName], happy baptism anniversary! Celebrating [YearsSinceBaptism] years since your dedication to Christ."
                           rows={5}
                           className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 focus:outline-none transition-all text-sm text-slate-800 placeholder-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-500 resize-none leading-relaxed"
                         />
                         <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-400">Max 160 chars per SMS part</span>
                            <span className={`text-xs font-semibold tabular-nums ${baptismAnniversaryTemplate.length > 160 ? 'text-amber-500' : baptismAnniversaryTemplate.length > 130 ? 'text-yellow-500' : 'text-slate-400'}`}>
                              {baptismAnniversaryTemplate.length}/160
                            </span>
                         </div>
                       </div>
                       <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 dark:text-slate-400">Live Preview</label>
                         <div className="flex flex-col items-start gap-1.5">
                           <span className="text-xs text-slate-400 dark:text-slate-500">From: <strong className="text-slate-600 dark:text-slate-300">ECCLESIA</strong></span>
                           <div className="w-full bg-white dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-slate-100 dark:border-slate-600">
                             <p className="text-sm text-slate-800 dark:text-white leading-relaxed whitespace-pre-wrap break-words min-h-[60px]">
                               {baptismAnniversaryTemplate
                                 ? baptismAnniversaryTemplate
                                     .replace(/\[FirstName\]/gi, 'Ama')
                                     .replace(/\[LastName\]/gi, 'Darko')
                                     .replace(/\[YearsSinceBaptism\]/gi, '5')
                                 : <span className="text-slate-300 dark:text-slate-500 italic text-xs">Your message preview will appear here as you type...</span>
                               }
                             </p>
                           </div>
                           <span className="text-xs text-slate-300 dark:text-slate-600 italic">Preview uses sample values: Ama Darko, 5 years since baptism</span>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Absentee Template Card */}
                   <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                     <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 dark:from-blue-900/20 dark:to-indigo-900/10 dark:border-slate-700">
                       <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center dark:bg-blue-900/30 text-lg">🙏</div>
                         <div>
                           <p className="text-sm font-bold text-slate-900 dark:text-white">Missed Service SMS</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400">Reach out to absent members with care</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                         <Clock size={11} /> Sundays · 2:30 PM
                       </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900/50">
                       <div className="p-4">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Message Copy</label>
                         <textarea
                           value={absenteeTemplate}
                           onChange={(e) => setAbsenteeTemplate(e.target.value)}
                           placeholder="Hi [FirstName], we missed you at service today! We hope you're doing well. See you next Sunday. 🙏"
                           rows={5}
                           className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:outline-none transition-all text-sm text-slate-800 placeholder-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-500 resize-none leading-relaxed"
                         />
                         <div className="flex items-center justify-between mt-2">
                           <span className="text-xs text-slate-400">Max 160 chars per SMS part</span>
                           <span className={`text-xs font-semibold tabular-nums ${absenteeTemplate.length > 160 ? 'text-amber-500' : absenteeTemplate.length > 130 ? 'text-yellow-500' : 'text-slate-400'}`}>
                             {absenteeTemplate.length}/160
                           </span>
                         </div>
                       </div>
                       <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 dark:text-slate-400">Live Preview</label>
                         <div className="flex flex-col items-start gap-1.5">
                           <span className="text-xs text-slate-400 dark:text-slate-500">From: <strong className="text-slate-600 dark:text-slate-300">ECCLESIA</strong></span>
                           <div className="w-full bg-white dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-slate-100 dark:border-slate-600">
                             <p className="text-sm text-slate-800 dark:text-white leading-relaxed whitespace-pre-wrap break-words min-h-[60px]">
                               {absenteeTemplate
                                 ? absenteeTemplate.replace(/\[FirstName\]/gi, 'Abena').replace(/\[LastName\]/gi, 'Owusu')
                                 : <span className="text-slate-300 dark:text-slate-500 italic text-xs">Your message preview will appear here as you type...</span>
                               }
                             </p>
                           </div>
                           <span className="text-xs text-slate-300 dark:text-slate-600 italic">Preview uses sample name: Abena Owusu</span>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Save Footer */}
                 <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                   <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">Changes are saved to the database and take effect immediately on the next scheduled run.</p>
                   <button
                     onClick={handleSaveTemplates}
                     disabled={isSavingTemplates}
                     className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 flex-shrink-0 ml-4"
                   >
                     {isSavingTemplates ? <><RefreshCw size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Templates</>}
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: History */}
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white px-2">Recent History</h3>
            
            <div className="space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                        <p>No message history yet.</p>
                    </div>
                ) : (
                    paginatedMessages.map((msg) => (
                        <div key={msg.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-lg ${msg.channel === 'email' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                    {msg.channel === 'email' ? <Mail size={16} /> : <Smartphone size={16} />}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                    <Clock size={12} />
                                    <span>{new Date(msg.sentAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            
                            {msg.subject && (
                                <h4 className="font-bold text-slate-900 mb-1 dark:text-white line-clamp-1">{msg.subject}</h4>
                            )}
                            
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2 dark:text-slate-400">{msg.content.replace(/<[^>]+>/g, '')}</p>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <Users size={12} />
                                    <span>{msg.recipientLabel}</span>
                                </div>
                                <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/30">
                                    {msg.recipientCount} Sent
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {messages.length > HISTORY_PAGE_SIZE && (
              <div className="flex items-center justify-between px-1 pt-1">
                <button
                  type="button"
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                  disabled={historyPage === totalHistoryPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

// Helper Component for Toolbar Buttons
const ToolbarBtn: React.FC<{ onClick?: () => void; icon: any; label: string }> = ({ onClick, icon: Icon, label }) => (
    <button 
        type="button"
        onClick={onClick}
        className="p-1.5 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 rounded transition-colors dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
        title={label}
    >
        <Icon size={16} strokeWidth={2.5} />
    </button>
);

export default Messaging;
