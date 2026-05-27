import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { User, Member, ManualMessagePayload, EmailTemplate } from '../types';
import { apiFetch } from '../utils/api';
import CustomSelect from '../components/CustomSelect';
import { 
  MessageSquare, Mail, Smartphone, Users, Send, 
  Bold, Italic, Underline, List, Link as LinkIcon, CheckCircle, Clock, 
  Image as ImageIcon, Table as TableIcon, AlignLeft, AlignCenter, AlignRight, 
  Type, Palette, Highlighter, Strikethrough, Heading, Eraser, LayoutList,
  ChevronDown, Upload, Scaling, RefreshCw, Save, ChevronLeft, ChevronRight, X,
  Code, Paperclip, FileText, Trash2, Plus, Edit3, Eye, Wifi, Battery, Sparkles
} from 'lucide-react';

interface MessagingProps {
  user: User | null;
}

const Messaging: React.FC<MessagingProps> = ({ user }) => {
  const { members, zones, messages, sendMessage, settings, updateSettings, stats, fetchAllMembers, emailTemplates, addEmailTemplate, updateEmailTemplate, deleteEmailTemplate } = useData();
  
  const formatHHMM = (timeStr?: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [triggerSuccess, setTriggerSuccess] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const handleTriggerAutomation = async (type: 'birthday' | 'anniversary' | 'baptism_anniversary' | 'absentee') => {
    setTriggeringJob(type);
    setTriggerSuccess(null);
    setTriggerError(null);
    try {
      const res = await apiFetch('/api/messaging/trigger-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (data && data.success) {
        setTriggerSuccess(type);
        setTimeout(() => setTriggerSuccess(null), 5000);
      } else {
        setTriggerError(data?.error?.message || `Failed to trigger ${type} automated SMS.`);
        setTimeout(() => setTriggerError(null), 5000);
      }
    } catch (err: any) {
      setTriggerError(err.message || 'Failed to trigger automated job.');
      setTimeout(() => setTriggerError(null), 5000);
    } finally {
      setTriggeringJob(null);
    }
  };

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
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'history'>('compose');

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
  
  // HTML Source Code toggle
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  
  // Attachments
  const [attachments, setAttachments] = useState<{ filename: string; content: string; contentType: string; size: number }[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Template selector in compose mode
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Email Template CRUD state (in templates tab)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateFormName, setTemplateFormName] = useState('');
  const [templateFormSubject, setTemplateFormSubject] = useState('');
  const [templateFormBody, setTemplateFormBody] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);
  const [templateSourceMode, setTemplateSourceMode] = useState(false);
  const [templateSourceCode, setTemplateSourceCode] = useState('');
  const templateEditorRef = useRef<HTMLDivElement>(null);
  const templateImageInputRef = useRef<HTMLInputElement>(null);
  
  // Cache all members for client-side filtering and autocomplete
  const [cachedMembers, setCachedMembers] = useState<Member[]>([]);
  useEffect(() => {
    fetchAllMembers().then(setCachedMembers);
  }, [fetchAllMembers]);
  
  // SMS Templates State (Automated)
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
    const labels: string[] = [];
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

  // --- SOURCE CODE TOGGLE ---
  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Switching FROM source TO visual
      setContent(sourceCode);
      if (editorRef.current) {
        editorRef.current.innerHTML = sourceCode;
      }
      setIsSourceMode(false);
    } else {
      // Switching FROM visual TO source
      const currentHTML = editorRef.current?.innerHTML || content;
      setSourceCode(currentHTML);
      setIsSourceMode(true);
    }
  };

  // --- ATTACHMENT LOGIC ---
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file: File = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Full = event.target?.result as string;
        // Strip data URL prefix to get pure base64
        const base64Content = base64Full.split(',')[1] || '';
        setAttachments(prev => [...prev, {
          filename: file.name,
          content: base64Content,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // --- TEMPLATE SELECTOR (COMPOSE MODE) ---
  const applyEmailTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setContent(template.body);
    if (editorRef.current) {
      editorRef.current.innerHTML = template.body;
    }
    if (isSourceMode) {
      setSourceCode(template.body);
    }
    setShowTemplateSelector(false);
    setChannel('email');
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
      recipientCount: displayCount,
      attachments: channel === 'email' && attachments.length > 0 ? attachments : undefined,
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
      setAttachments([]);
      setSourceCode('');
      setIsSourceMode(false);
      if (editorRef.current) editorRef.current.innerHTML = '';
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      setSendError(result?.message || 'Failed to send message');
    }
  };

  // --- SAVE SMS TEMPLATES LOGIC ---
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

  // --- EMAIL TEMPLATE CRUD ---
  const startCreateTemplate = () => {
    setIsCreatingTemplate(true);
    setEditingTemplate(null);
    setTemplateFormName('');
    setTemplateFormSubject('');
    setTemplateFormBody('');
    setTemplateSourceMode(false);
    setTemplateSourceCode('');
    // Clear the editor content after render
    setTimeout(() => {
      if (templateEditorRef.current) templateEditorRef.current.innerHTML = '';
    }, 0);
  };

  const startEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsCreatingTemplate(false);
    setTemplateFormName(template.name);
    setTemplateFormSubject(template.subject);
    setTemplateFormBody(template.body);
    setTemplateSourceMode(false);
    setTemplateSourceCode(template.body);
    // Populate the editor content after render
    setTimeout(() => {
      if (templateEditorRef.current) templateEditorRef.current.innerHTML = template.body;
    }, 0);
  };

  const cancelTemplateForm = () => {
    setIsCreatingTemplate(false);
    setEditingTemplate(null);
    setTemplateFormName('');
    setTemplateFormSubject('');
    setTemplateFormBody('');
    setTemplateSourceMode(false);
    setTemplateSourceCode('');
  };

  const handleSaveEmailTemplate = async () => {
    if (!templateFormName.trim()) return;
    // If in source mode, sync source to body before saving
    const bodyToSave = templateSourceMode ? templateSourceCode : templateFormBody;
    setIsSavingTemplate(true);
    if (editingTemplate) {
      await updateEmailTemplate({ ...editingTemplate, name: templateFormName, subject: templateFormSubject, body: bodyToSave });
    } else {
      await addEmailTemplate({ name: templateFormName, subject: templateFormSubject, body: bodyToSave });
    }
    setIsSavingTemplate(false);
    cancelTemplateForm();
  };

  // Template editor helpers
  const templateExecCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (templateEditorRef.current) {
      templateEditorRef.current.focus();
      setTemplateFormBody(templateEditorRef.current.innerHTML);
    }
  };

  const handleTemplateEditorInput = () => {
    if (templateEditorRef.current) {
      setTemplateFormBody(templateEditorRef.current.innerHTML);
    }
  };

  const toggleTemplateSourceMode = () => {
    if (templateSourceMode) {
      // Source -> Visual
      setTemplateFormBody(templateSourceCode);
      if (templateEditorRef.current) {
        templateEditorRef.current.innerHTML = templateSourceCode;
      }
      setTemplateSourceMode(false);
    } else {
      // Visual -> Source
      const currentHTML = templateEditorRef.current?.innerHTML || templateFormBody;
      setTemplateSourceCode(currentHTML);
      setTemplateSourceMode(true);
    }
  };

  const insertTemplatePlaceholder = (placeholder: string) => {
    if (templateSourceMode) {
      setTemplateSourceCode(prev => prev + placeholder);
    } else {
      templateExecCmd('insertText', placeholder);
    }
  };

  const handleTemplateImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && templateEditorRef.current) {
          templateExecCmd('insertImage', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    if (templateImageInputRef.current) templateImageInputRef.current.value = '';
  };

  const handleDeleteEmailTemplate = async (id: string) => {
    if (!confirm('Delete this email template permanently?')) return;
    await deleteEmailTemplate(id);
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

  // Template sub-tab state (within Templates tab)
  const [templateSubTab, setTemplateSubTab] = useState<'sms' | 'email'>('sms');

  return (
    <div className="space-y-8 animate-enter pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl -z-10 select-none"></div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight dark:text-white">Messaging Workspace</h1>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-black text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
              PRO
            </span>
          </div>
          <p className="text-slate-500 mt-1 dark:text-slate-400 text-xs sm:text-sm">Broadcast announcements and schedule automated milestones to your congregation.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full">
        {/* Main Column */}
        <div className="space-y-6">
          
          {/* PREMIUM PILL-BASED NAVIGATION TABS */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md">
            <button 
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
                activeTab === 'compose' 
                  ? 'bg-white text-indigo-600 shadow-md dark:bg-slate-700 dark:text-white' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Send size={12} />
              Compose Announcement
            </button>
            {canManageTemplates && (
              <button 
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
                  activeTab === 'templates' 
                    ? 'bg-white text-indigo-600 shadow-md dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <LayoutList size={12} />
                Templates & Automated SMS
              </button>
            )}
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
                activeTab === 'history' 
                  ? 'bg-white text-indigo-600 shadow-md dark:bg-slate-700 dark:text-white' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Clock size={12} />
              Recent History
            </button>
          </div>

          <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800/60 p-6 relative overflow-hidden transition-all duration-500">
             
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

                    <div className="mb-8 rounded-3xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-5 shadow-md shadow-slate-100/30 dark:border-slate-850 dark:from-slate-900/60 dark:to-slate-950/60">
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(250px,0.95fr)_minmax(0,1.45fr)]">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider dark:text-slate-500">Delivery Channel</label>
                                    <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50/50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-950/40 dark:text-indigo-400">
                                        {channel === 'email' ? 'Rich formatting' : 'Plain Text'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80 border border-slate-200/20 dark:border-slate-700/30">
                                    <button 
                                       onClick={() => setChannel('email')}
                                       className={audienceToggleClass(channel === 'email')}
                                    >
                                        <Mail size={14} /> Email
                                    </button>
                                    <button 
                                       onClick={() => setChannel('sms')}
                                       className={audienceToggleClass(channel === 'sms')}
                                    >
                                        <Smartphone size={14} /> SMS
                                    </button>
                                </div>
                                <div className="rounded-2xl border border-indigo-100/50 bg-indigo-50/10 p-4 dark:border-indigo-950/30 dark:bg-indigo-950/10 backdrop-blur-sm relative overflow-hidden group">
                                    <div className="absolute -right-6 -bottom-6 text-indigo-500/5 group-hover:text-indigo-500/10 group-hover:scale-110 transition-transform duration-500">
                                        <Users size={80} strokeWidth={1} />
                                    </div>
                                    <div className="flex items-start justify-between gap-3 relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Targeting Audience Preview</p>
                                            <p className="mt-1.5 text-sm font-bold text-slate-850 dark:text-slate-100 line-clamp-1">{recipientLabel}</p>
                                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">Updates dynamically based on your filters.</p>
                                        </div>
                                        <div className="inline-flex h-12 min-w-[72px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-3 text-sm font-black text-white shadow-md shadow-indigo-500/20">
                                            <span className="text-[9px] font-bold opacity-85">TOTAL</span>
                                            <span className="text-base tabular-nums tracking-tight">{displayCount}</span>
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
                                            <div className="mt-3 flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 animate-enter scrollbar-hide">
                                                {selectedMembers.map(member => (
                                                    <div
                                                        key={member.id}
                                                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 animate-enter hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                                                    >
                                                        <span className="truncate max-w-[150px]">{member.firstName} {member.lastName}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSelectedMember(member.id)}
                                                            className="p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 transition-all active:scale-90"
                                                            aria-label={`Remove ${member.firstName} {member.lastName}`}
                                                        >
                                                            <X size={12} strokeWidth={2.5} />
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
                           <div className="animate-enter space-y-3">
                               {/* Template Selector */}
                               <div className="relative">
                                   <button
                                     type="button"
                                     onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                                     className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border border-dashed border-indigo-300 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition-colors dark:border-indigo-500/30 dark:text-indigo-400 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10"
                                   >
                                     <LayoutList size={14} />
                                     Use Email Template
                                     <ChevronDown size={14} className={`transition-transform ${showTemplateSelector ? 'rotate-180' : ''}`} />
                                   </button>

                                   {showTemplateSelector && (
                                     <div className="absolute z-50 mt-2 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-enter">
                                       <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Select a Template</p>
                                       </div>
                                       {emailTemplates.length === 0 ? (
                                         <div className="px-4 py-8 text-center text-sm text-slate-400">
                                           <FileText size={24} className="mx-auto mb-2 opacity-30" />
                                           No email templates yet. Create one in the Templates tab.
                                         </div>
                                       ) : (
                                         <div className="max-h-60 overflow-y-auto">
                                           {emailTemplates.map(t => (
                                             <button
                                               key={t.id}
                                               type="button"
                                               onClick={() => applyEmailTemplate(t)}
                                               className="flex w-full items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700 text-left transition-colors"
                                             >
                                               <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center dark:from-indigo-900/30 dark:to-violet-900/30">
                                                 <Mail size={14} className="text-indigo-600 dark:text-indigo-400" />
                                               </div>
                                               <div className="min-w-0 flex-1">
                                                 <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{t.name}</p>
                                                 <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.subject}</p>
                                               </div>
                                             </button>
                                           ))}
                                         </div>
                                       )}
                                     </div>
                                   )}
                               </div>

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

                               {/* HTML Source Toggle */}
                               <div className="flex items-center gap-0.5 flex-shrink-0">
                                 <button
                                   type="button"
                                   onClick={toggleSourceMode}
                                   className={`p-1.5 rounded transition-colors ${isSourceMode ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-200 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}
                                   title={isSourceMode ? 'Switch to Visual Editor' : 'Edit HTML Source'}
                                 >
                                   <Code size={16} strokeWidth={2.5} />
                                 </button>
                               </div>
                           </div>
                           
                           {/* EDITABLE AREA or SOURCE CODE */}
                           {isSourceMode ? (
                             <textarea
                               value={sourceCode}
                               onChange={(e) => setSourceCode(e.target.value)}
                               className="w-full p-6 h-80 focus:outline-none overflow-y-auto bg-slate-950 text-emerald-400 font-mono text-sm leading-relaxed resize-none"
                               style={{ minHeight: '320px' }}
                               placeholder="Paste or edit raw HTML here..."
                               spellCheck={false}
                             />
                           ) : (
                             <div 
                                ref={editorRef}
                                contentEditable
                                onInput={handleEditorInput}
                                className="w-full p-6 h-80 focus:outline-none overflow-y-auto bg-white text-slate-700 dark:bg-slate-900 dark:text-white prose dark:prose-invert max-w-none font-sans"
                                style={{ minHeight: '320px' }}
                                suppressContentEditableWarning={true}
                             >
                             </div>
                           )}
                           
                           <div className="bg-slate-50 border-t border-slate-200 p-1.5 flex justify-between items-center px-4 dark:bg-slate-900 dark:border-slate-800">
                               <span className="text-xs text-slate-400">
                                 {isSourceMode ? 'HTML Source Mode' : 'Visual Editor'}
                               </span>
                               <span className={`text-xs ${channel === 'sms' && stripHtmlLength(content) > 160 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                 {stripHtmlLength(isSourceMode ? sourceCode : content) || 0} characters {channel === 'sms' && stripHtmlLength(content) > 160 && '(Message will be split into multiple parts)'}
                               </span>
                           </div>
                       </div>

                       {/* --- ATTACHMENTS (Email Only) --- */}
                       {channel === 'email' && (
                         <div className="animate-enter space-y-3">
                           <div className="flex items-center gap-3">
                             <button
                               type="button"
                               onClick={() => attachmentInputRef.current?.click()}
                               className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800"
                             >
                               <Paperclip size={14} />
                               Attach Files
                             </button>
                             {attachments.length > 0 && (
                               <span className="text-xs text-slate-400 dark:text-slate-500">
                                 {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
                               </span>
                             )}
                             <input
                               ref={attachmentInputRef}
                               type="file"
                               multiple
                               onChange={handleAttachmentUpload}
                               className="hidden"
                             />
                           </div>

                           {attachments.length > 0 && (
                             <div className="flex flex-wrap gap-2">
                               {attachments.map((att, index) => (
                                 <div
                                   key={index}
                                   className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800 group hover:border-red-200 dark:hover:border-red-800 transition-colors"
                                 >
                                   <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center dark:bg-indigo-900/30 flex-shrink-0">
                                     <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
                                   </div>
                                   <div className="min-w-0">
                                     <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{att.filename}</p>
                                     <p className="text-[10px] text-slate-400 dark:text-slate-500">{formatFileSize(att.size)}</p>
                                   </div>
                                   <button
                                     type="button"
                                     onClick={() => removeAttachment(index)}
                                     className="ml-1 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
                                   >
                                     <X size={12} />
                                   </button>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       )}
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

                 {/* PREMIUM COHESIVE SUB-TABS */}
                 <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md mb-6">
                   <button
                     onClick={() => setTemplateSubTab('sms')}
                     className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
                       templateSubTab === 'sms' 
                         ? 'bg-white text-indigo-600 shadow-md dark:bg-slate-700 dark:text-white' 
                         : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                     }`}
                   >
                     <Smartphone size={13} />
                     SMS Automated
                   </button>
                   <button
                     onClick={() => setTemplateSubTab('email')}
                     className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
                       templateSubTab === 'email' 
                         ? 'bg-white text-indigo-600 shadow-md dark:bg-slate-700 dark:text-white' 
                         : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                     }`}
                   >
                     <Mail size={13} />
                     Email Templates
                   </button>
                 </div>

                 {/* SMS Automated Templates */}
                 {templateSubTab === 'sms' && (
                   <div className="animate-enter">
                     {/* Header */}
                     <div className="mb-6">
                       <h3 className="text-base font-bold text-slate-900 dark:text-white">Automated SMS Templates</h3>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Messages sent automatically on a fixed schedule. Use placeholders to personalise.</p>
                       <div className="flex flex-wrap items-center gap-2 mt-3">
                         <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Placeholders:</span>
                         {['[FirstName]', '[LastName]', '[YearsMarried]', '[YearsSinceBaptism]', '[EventName]'].map(tag => (
                           <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-mono font-semibold border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 select-all cursor-pointer hover:bg-indigo-100 transition-colors">
                             {tag}
                           </span>
                         ))}
                       </div>
                     </div>

                      {triggerSuccess && (
                        <div className="p-4 mb-4 rounded-2xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center gap-2.5 animate-enter">
                          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Successfully triggered the {triggerSuccess} automated SMS broadcast! Check the Render logs or Message History for details.</span>
                        </div>
                      )}
                      {triggerError && (
                        <div className="p-4 mb-4 rounded-2xl bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 text-red-800 dark:text-red-300 text-xs font-black flex items-center gap-2.5 animate-enter">
                          <X size={16} className="text-red-600 dark:text-red-400" />
                          <span>{triggerError}</span>
                        </div>
                      )}
                      <div className="space-y-5">
                        {/* Birthday Template Card */}
                        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-slate-200/60 dark:from-pink-900/10 dark:to-rose-900/5 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/20 flex items-center justify-center text-base">🎂</div>
                              <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">Birthday SMS Broadcast</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Automated happy birthday milestone</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleTriggerAutomation('birthday')}
                                disabled={triggeringJob !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 text-[10px] font-black shadow-sm transition-all border border-indigo-100 dark:border-indigo-900/40 active:scale-95 disabled:opacity-50"
                              >
                                {triggeringJob === 'birthday' ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                                Trigger Now
                              </button>
                              <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                <Clock size={11} className="text-pink-500 dark:text-pink-400" /> Daily · {formatHHMM(settings.birthday_sms_time || '08:00')}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/20">
                            <div className="p-5 flex flex-col justify-between">
                              <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 dark:text-slate-500">Message Template Copy</label>
                                <textarea
                                  value={birthdayTemplate}
                                  onChange={(e) => setBirthdayTemplate(e.target.value)}
                                  placeholder="Hi [FirstName], Happy Birthday! 🎉 God bless you this year and always."
                                  rows={5}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 focus:outline-none transition-all text-sm text-slate-800 placeholder-slate-300 dark:bg-slate-950 dark:border-slate-850 dark:text-white dark:placeholder-slate-600 resize-none leading-relaxed"
                                />
                              </div>
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                                <span className="text-[11px] text-slate-400">Standard SMS is max 160 characters</span>
                                <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded ${birthdayTemplate.length > 160 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-950/40'}`}>
                                  {birthdayTemplate.length}/160
                                </span>
                              </div>
                            </div>
                            
                            {/* Smartphone Live Preview Mockup */}
                            <div className="p-6 bg-slate-50/40 dark:bg-slate-950/10 flex flex-col items-center justify-center min-h-[380px]">
                              <div className="w-full max-w-[250px] rounded-[36px] border-[8px] border-slate-950 bg-slate-950 shadow-2xl relative overflow-hidden dark:border-slate-800 aspect-[9/18] min-h-[340px] flex flex-col justify-between">
                                {/* Speaker notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-b-xl z-20 flex items-center justify-center">
                                  <div className="w-6 h-0.5 bg-slate-800 rounded-full"></div>
                                </div>
                                
                                {/* Top status bar */}
                                <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[8px] font-black text-slate-400 relative z-10 select-none">
                                  <span>9:41 AM</span>
                                  <div className="flex items-center gap-1">
                                    <Wifi size={8} />
                                    <Battery size={8} />
                                  </div>
                                </div>
                                
                                {/* Contact info bar */}
                                <div className="px-3 py-1.5 border-b border-slate-200/10 bg-slate-950/90 backdrop-blur-md flex flex-col items-center select-none text-center">
                                  <div className="w-6 h-6 rounded-full bg-pink-500 text-[9px] font-black text-white flex items-center justify-center shadow-md shadow-pink-500/10">
                                    🎂
                                  </div>
                                  <span className="text-[10px] font-black text-slate-200 mt-1 uppercase tracking-wider">{settings.church_name || 'Ecclesia'}</span>
                                  <span className="text-[7px] text-pink-400 uppercase font-extrabold tracking-widest mt-0.5">Birthday SMS</span>
                                </div>
                                
                                {/* Chat Bubble Screen */}
                                <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end bg-[#f2f2f7] dark:bg-[#1c1c1e] min-h-[140px] text-left">
                                  <div className="self-start max-w-[88%] rounded-2xl rounded-tl-sm bg-white dark:bg-[#2c2c2e] p-3 shadow-sm border border-slate-100/50 dark:border-slate-800/50 relative group">
                                    <p className="text-xs text-slate-800 dark:text-white leading-normal whitespace-pre-wrap break-words">
                                      {birthdayTemplate
                                        ? birthdayTemplate.replace(/\[FirstName\]/gi, 'Kwame').replace(/\[LastName\]/gi, 'Mensah')
                                        : <span className="text-slate-350 dark:text-slate-655 italic text-[11px]">Hi Kwame, Happy Birthday! 🎉 God bless you this year and always.</span>
                                      }
                                    </p>
                                    <span className="block mt-1 text-[7px] font-bold text-slate-400 dark:text-slate-500 text-right select-none uppercase">Delivered · {formatHHMM(settings.birthday_sms_time || '08:00')}</span>
                                  </div>
                                </div>
                                
                                {/* Home swipe indicator */}
                                <div className="pb-1 pt-0.5 flex items-center justify-center bg-[#f2f2f7] dark:bg-[#1c1c1e] select-none">
                                   <div className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>

                       {/* Anniversary Template Card */}
                       <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-slate-200/60 dark:from-amber-900/10 dark:to-yellow-900/5 dark:border-slate-800">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20 flex items-center justify-center text-base">💍</div>
                             <div>
                               <p className="text-sm font-black text-slate-900 dark:text-white">Wedding Anniversary SMS</p>
                               <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Celebrate married couples' milestones</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleTriggerAutomation('anniversary')}
                                disabled={triggeringJob !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 text-[10px] font-black shadow-sm transition-all border border-indigo-100 dark:border-indigo-900/40 active:scale-95 disabled:opacity-50"
                              >
                                {triggeringJob === 'anniversary' ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                                Trigger Now
                              </button>
                              <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                <Clock size={11} className="text-amber-500 dark:text-amber-400" /> Daily · {formatHHMM(settings.anniversary_sms_time || '08:10')}
                              </div>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/20">
                           <div className="p-5 flex flex-col justify-between">
                             <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 dark:text-slate-500">Message Template Copy</label>
                               <textarea
                                 value={anniversaryTemplate}
                                 onChange={(e) => setAnniversaryTemplate(e.target.value)}
                                 placeholder="Hi [FirstName], happy wedding anniversary! Wishing you many more blessed years."
                                 rows={5}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 focus:outline-none transition-all text-sm text-slate-800 placeholder-slate-300 dark:bg-slate-950 dark:border-slate-850 dark:text-white dark:placeholder-slate-600 resize-none leading-relaxed"
                               />
                             </div>
                             <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                               <span className="text-[11px] text-slate-400">Standard SMS is max 160 characters</span>
                               <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded ${anniversaryTemplate.length > 160 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-950/40'}`}>
                                 {anniversaryTemplate.length}/160
                               </span>
                             </div>
                           </div>
                                            {/* Smartphone Live Preview Mockup */}
                            <div className="p-6 bg-slate-50/40 dark:bg-slate-950/10 flex flex-col items-center justify-center min-h-[380px]">
                              <div className="w-full max-w-[250px] rounded-[36px] border-[8px] border-slate-950 bg-slate-950 shadow-2xl relative overflow-hidden dark:border-slate-800 aspect-[9/18] min-h-[340px] flex flex-col justify-between">
                                {/* Speaker notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-b-xl z-20 flex items-center justify-center">
                                  <div className="w-6 h-0.5 bg-slate-800 rounded-full"></div>
                                </div>
                                
                                {/* Top status bar */}
                                <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[8px] font-black text-slate-400 relative z-10 select-none">
                                  <span>9:41 AM</span>
                                  <div className="flex items-center gap-1">
                                    <Wifi size={8} />
                                    <Battery size={8} />
                                  </div>
                                </div>
                                
                                {/* Contact info bar */}
                                <div className="px-3 py-1.5 border-b border-slate-200/10 bg-slate-950/90 backdrop-blur-md flex flex-col items-center select-none text-center">
                                  <div className="w-6 h-6 rounded-full bg-amber-500 text-[9px] font-black text-white flex items-center justify-center shadow-md shadow-amber-500/10">
                                    💍
                                  </div>
                                  <span className="text-[10px] font-black text-slate-200 mt-1 uppercase tracking-wider">{settings.church_name || 'Ecclesia'}</span>
                                  <span className="text-[7px] text-amber-400 uppercase font-extrabold tracking-widest mt-0.5">Anniversary SMS</span>
                                </div>
                                
                                {/* Chat Bubble Screen */}
                                <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end bg-[#f2f2f7] dark:bg-[#1c1c1e] min-h-[140px] text-left">
                                  <div className="self-start max-w-[88%] rounded-2xl rounded-tl-sm bg-white dark:bg-[#2c2c2e] p-3 shadow-sm border border-slate-100/50 dark:border-slate-800/50 relative group">
                                    <p className="text-xs text-slate-800 dark:text-white leading-normal whitespace-pre-wrap break-words">
                                      {anniversaryTemplate
                                        ? anniversaryTemplate
                                            .replace(/\[FirstName\]/gi, 'Kojo')
                                            .replace(/\[LastName\]/gi, 'Boateng')
                                            .replace(/\[YearsMarried\]/gi, '12')
                                        : <span className="text-slate-350 dark:text-slate-655 italic text-[11px]">Hi Kojo, happy wedding anniversary! Wishing you many more blessed years.</span>
                                      }
                                    </p>
                                    <span className="block mt-1 text-[7px] font-bold text-slate-400 dark:text-slate-500 text-right select-none uppercase">Delivered · {formatHHMM(settings.anniversary_sms_time || '08:10')}</span>
                                  </div>
                                </div>
                                
                                {/* Home swipe indicator */}
                                <div className="pb-1 pt-0.5 flex items-center justify-center bg-[#f2f2f7] dark:bg-[#1c1c1e] select-none">
                                  <div className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                                </div>
                              </div>
                            </div>
                         </div>
                       </div>

                       {/* Baptism Anniversary Template Card */}
                       <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-cyan-50 to-teal-50 border-b border-slate-200/60 dark:from-cyan-900/10 dark:to-teal-900/5 dark:border-slate-800">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-900/20 flex items-center justify-center text-base">💧</div>
                             <div>
                               <p className="text-sm font-black text-slate-900 dark:text-white">Baptism Anniversary SMS</p>
                               <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Celebrate members' baptism milestones</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleTriggerAutomation('baptism_anniversary')}
                                disabled={triggeringJob !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 text-[10px] font-black shadow-sm transition-all border border-indigo-100 dark:border-indigo-900/40 active:scale-95 disabled:opacity-50"
                              >
                                {triggeringJob === 'baptism_anniversary' ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                                Trigger Now
                              </button>
                              <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                <Clock size={11} className="text-cyan-500 dark:text-cyan-400" /> Daily · {formatHHMM(settings.baptism_anniversary_sms_time || '08:20')}
                              </div>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/20">
                           <div className="p-5 flex flex-col justify-between">
                             <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 dark:text-slate-500">Message Template Copy</label>
                               <textarea
                                 value={baptismAnniversaryTemplate}
                                 onChange={(e) => setBaptismAnniversaryTemplate(e.target.value)}
                                 placeholder="Hi [FirstName], happy baptism anniversary! Celebrating [YearsSinceBaptism] years since your dedication to Christ."
                                 rows={5}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 focus:outline-none transition-all text-sm text-slate-800 placeholder-slate-300 dark:bg-slate-950 dark:border-slate-850 dark:text-white dark:placeholder-slate-600 resize-none leading-relaxed"
                               />
                             </div>
                             <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-855">
                               <span className="text-[11px] text-slate-400">Standard SMS is max 160 characters</span>
                               <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded ${baptismAnniversaryTemplate.length > 160 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-950/40'}`}>
                                 {baptismAnniversaryTemplate.length}/160
                               </span>
                             </div>
                           </div>
                           
                           {/* Smartphone Live Preview Mockup */}
                           <div className="p-6 bg-slate-50/40 dark:bg-slate-950/10 flex flex-col items-center justify-center min-h-[380px]">
                             <div className="w-full max-w-[250px] rounded-[36px] border-[8px] border-slate-950 bg-slate-950 shadow-2xl relative overflow-hidden dark:border-slate-800 aspect-[9/18] min-h-[340px] flex flex-col justify-between">
                               {/* Speaker notch */}
                               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-b-xl z-20 flex items-center justify-center">
                                 <div className="w-6 h-0.5 bg-slate-800 rounded-full"></div>
                               </div>
                               
                               {/* Top status bar */}
                               <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[8px] font-black text-slate-400 relative z-10 select-none">
                                 <span>9:41 AM</span>
                                 <div className="flex items-center gap-1">
                                   <Wifi size={8} />
                                   <Battery size={8} />
                                 </div>
                               </div>
                               
                               {/* Contact info bar */}
                               <div className="px-3 py-1.5 border-b border-slate-200/10 bg-slate-950/90 backdrop-blur-md flex flex-col items-center select-none text-center">
                                 <div className="w-6 h-6 rounded-full bg-cyan-500 text-[9px] font-black text-white flex items-center justify-center shadow-md shadow-cyan-500/10">
                                   💧
                                 </div>
                                 <span className="text-[10px] font-black text-slate-200 mt-1 uppercase tracking-wider">{settings.church_name || 'Ecclesia'}</span>
                                 <span className="text-[7px] text-cyan-400 uppercase font-extrabold tracking-widest mt-0.5">Baptism SMS</span>
                                </div>
                               
                               {/* Chat Bubble Screen */}
                               <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end bg-[#f2f2f7] dark:bg-[#1c1c1e] min-h-[140px] text-left">
                                 <div className="self-start max-w-[88%] rounded-2xl rounded-tl-sm bg-white dark:bg-[#2c2c2e] p-3 shadow-sm border border-slate-100/50 dark:border-slate-800/50 relative group">
                                   <p className="text-xs text-slate-800 dark:text-white leading-normal whitespace-pre-wrap break-words">
                                     {baptismAnniversaryTemplate
                                       ? baptismAnniversaryTemplate
                                           .replace(/\[FirstName\]/gi, 'Ama')
                                           .replace(/\[LastName\]/gi, 'Darko')
                                           .replace(/\[YearsSinceBaptism\]/gi, '5')
                                       : <span className="text-slate-350 dark:text-slate-655 italic text-[11px]">Hi Ama, happy baptism anniversary! Celebrating 5 years since your dedication to Christ.</span>
                                     }
                                   </p>
                                   <span className="block mt-1 text-[7px] font-bold text-slate-400 dark:text-slate-500 text-right select-none uppercase">Delivered · {formatHHMM(settings.baptism_anniversary_sms_time || '08:20')}</span>
                                 </div>
                               </div>
                               
                               {/* Home swipe indicator */}
                               <div className="pb-1 pt-0.5 flex items-center justify-center bg-[#f2f2f7] dark:bg-[#1c1c1e] select-none">
                                 <div className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                       {/* Missed Service Template Card */}
                       <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200/60 dark:from-blue-900/10 dark:to-indigo-900/5 dark:border-slate-800">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 flex items-center justify-center text-base">🙏</div>
                             <div>
                               <p className="text-sm font-black text-slate-900 dark:text-white">Missed Service SMS</p>
                               <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Reach out to absent members with care</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleTriggerAutomation('absentee')}
                                disabled={triggeringJob !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 text-[10px] font-black shadow-sm transition-all border border-indigo-100 dark:border-indigo-900/40 active:scale-95 disabled:opacity-50"
                              >
                                {triggeringJob === 'absentee' ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                                Trigger Now
                              </button>
                              <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                <Clock size={11} className="text-blue-500 dark:text-blue-400" /> {settings.absentee_sms_delay_hours || '1'} {parseInt(settings.absentee_sms_delay_hours || '1', 10) === 1 ? 'hour' : 'hours'} after completion
                              </div>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/20">
                           <div className="p-5 flex flex-col justify-between">
                             <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 dark:text-slate-500">Message Template Copy</label>
                               <textarea
                                 value={absenteeTemplate}
                                 onChange={(e) => setAbsenteeTemplate(e.target.value)}
                                 placeholder="Hi [FirstName], we missed you at [EventName] today! We hope you're doing well."
                                 rows={5}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:outline-none transition-all text-sm text-slate-800 placeholder-slate-300 dark:bg-slate-950 dark:border-slate-850 dark:text-white dark:placeholder-slate-600 resize-none leading-relaxed"
                               />
                             </div>
                             <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                               <span className="text-[11px] text-slate-400">Standard SMS is max 160 characters</span>
                               <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded ${absenteeTemplate.length > 160 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-950/40'}`}>
                                 {absenteeTemplate.length}/160
                               </span>
                             </div>
                           </div>
                           
                           {/* Smartphone Live Preview Mockup */}
                           <div className="p-6 bg-slate-50/40 dark:bg-slate-950/10 flex flex-col items-center justify-center min-h-[380px]">
                             <div className="w-full max-w-[250px] rounded-[36px] border-[8px] border-slate-950 bg-slate-950 shadow-2xl relative overflow-hidden dark:border-slate-800 aspect-[9/18] min-h-[340px] flex flex-col justify-between">
                               {/* Speaker notch */}
                               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-b-xl z-20 flex items-center justify-center">
                                 <div className="w-6 h-0.5 bg-slate-800 rounded-full"></div>
                               </div>
                               
                               {/* Top status bar */}
                               <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[8px] font-black text-slate-400 relative z-10 select-none">
                                 <span>9:41 AM</span>
                                 <div className="flex items-center gap-1">
                                   <Wifi size={8} />
                                   <Battery size={8} />
                                 </div>
                               </div>
                               
                               {/* Contact info bar */}
                               <div className="px-3 py-1.5 border-b border-slate-200/10 bg-slate-950/90 backdrop-blur-md flex flex-col items-center select-none text-center">
                                 <div className="w-6 h-6 rounded-full bg-blue-500 text-[9px] font-black text-white flex items-center justify-center shadow-md shadow-blue-500/10">
                                   🙏
                                 </div>
                                 <span className="text-[10px] font-black text-slate-200 mt-1 uppercase tracking-wider">{settings.church_name || 'Ecclesia'}</span>
                                 <span className="text-[7px] text-blue-400 uppercase font-extrabold tracking-widest mt-0.5">Missed Service</span>
                               </div>
                               
                               {/* Chat Bubble Screen */}
                               <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end bg-[#f2f2f7] dark:bg-[#1c1c1e] min-h-[140px] text-left">
                                 <div className="self-start max-w-[88%] rounded-2xl rounded-tl-sm bg-white dark:bg-[#2c2c2e] p-3 shadow-sm border border-slate-100/50 dark:border-slate-800/50 relative group">
                                   <p className="text-xs text-slate-800 dark:text-white leading-normal whitespace-pre-wrap break-words">
                                     {absenteeTemplate
                                       ? absenteeTemplate
                                           .replace(/\[FirstName\]/gi, 'Abena')
                                           .replace(/\[LastName\]/gi, 'Owusu')
                                           .replace(/\[EventName\]/gi, 'Sunday Service')
                                           .replace(/\[ServiceName\]/gi, 'Sunday Service')
                                       : <span className="text-slate-350 dark:text-slate-655 italic text-[11px]">Hi Abena, we missed you at Sunday Service today! We hope you're doing well.</span>
                                     }
                                   </p>
                                   <span className="block mt-1 text-[7px] font-bold text-slate-400 dark:text-slate-500 text-right select-none uppercase">Delivered · {settings.absentee_sms_delay_hours || '1'} {parseInt(settings.absentee_sms_delay_hours || '1', 10) === 1 ? 'hour' : 'hours'} after completion</span>
                                 </div>
                               </div>
                               
                               {/* Home swipe indicator */}
                               <div className="pb-1 pt-0.5 flex items-center justify-center bg-[#f2f2f7] dark:bg-[#1c1c1e] select-none">
                                 <div className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                               </div>
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

                 {/* Email Templates CRUD */}
                 {templateSubTab === 'email' && (
                   <div className="animate-enter">
                     <div className="flex items-center justify-between mb-6">
                       <div>
                         <h3 className="text-base font-bold text-slate-900 dark:text-white">Email Templates</h3>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create and manage reusable email layouts. Use them when composing announcements.</p>
                       </div>
                       {!isCreatingTemplate && !editingTemplate && (
                         <button
                           onClick={startCreateTemplate}
                           className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                         >
                           <Plus size={14} /> New Template
                         </button>
                       )}
                     </div>

                     {/* Template Form (Create / Edit) */}
                     {(isCreatingTemplate || editingTemplate) && (
                       <div className="mb-6 p-5 rounded-2xl border border-indigo-200 bg-indigo-50/30 dark:border-indigo-500/20 dark:bg-indigo-500/5 animate-enter">
                         <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                           {editingTemplate ? 'Edit Template' : 'New Email Template'}
                         </h4>
                         <div className="space-y-3">
                           <input
                             type="text"
                             value={templateFormName}
                             onChange={(e) => setTemplateFormName(e.target.value)}
                             placeholder="Template Name (e.g. Happy Birthday, Monthly Newsletter)"
                             className={textInputClass}
                           />
                           <input
                             type="text"
                             value={templateFormSubject}
                             onChange={(e) => setTemplateFormSubject(e.target.value)}
                             placeholder="Default Subject Line"
                             className={textInputClass}
                           />

                           {/* Placeholders */}
                           <div className="flex flex-wrap items-center gap-2">
                             <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Insert Placeholder:</span>
                             {['[FirstName]', '[LastName]', '[Email]', '[Phone]'].map(tag => (
                               <button
                                 key={tag}
                                 type="button"
                                 onClick={() => insertTemplatePlaceholder(tag)}
                                 className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-mono font-semibold border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors active:scale-95"
                               >
                                 {tag}
                               </button>
                             ))}
                           </div>

                           {/* Visual Editor with Toolbar */}
                           <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all dark:border-slate-700 bg-white dark:bg-slate-950">
                             {/* Toolbar */}
                             <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 overflow-x-auto whitespace-nowrap select-none scrollbar-hide">
                               <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 dark:border-slate-600 flex-shrink-0">
                                 <ToolbarBtn onClick={() => templateExecCmd('bold')} icon={Bold} label="Bold" />
                                 <ToolbarBtn onClick={() => templateExecCmd('italic')} icon={Italic} label="Italic" />
                                 <ToolbarBtn onClick={() => templateExecCmd('underline')} icon={Underline} label="Underline" />
                               </div>
                               <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 dark:border-slate-600 flex-shrink-0">
                                 <div className="relative group flex items-center justify-center w-8 h-8 hover:bg-slate-200 rounded dark:hover:bg-slate-700 cursor-pointer overflow-hidden">
                                   <Scaling size={16} className="text-slate-600 dark:text-slate-300" />
                                   <select onChange={(e) => templateExecCmd('fontSize', e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer">
                                     <option value="2">Small</option>
                                     <option value="3">Normal</option>
                                     <option value="5">Large</option>
                                     <option value="7">Huge</option>
                                   </select>
                                 </div>
                               </div>
                               <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 dark:border-slate-600 flex-shrink-0">
                                 <ToolbarBtn onClick={() => templateExecCmd('justifyLeft')} icon={AlignLeft} label="Align Left" />
                                 <ToolbarBtn onClick={() => templateExecCmd('justifyCenter')} icon={AlignCenter} label="Align Center" />
                                 <ToolbarBtn onClick={() => templateExecCmd('justifyRight')} icon={AlignRight} label="Align Right" />
                                 <ToolbarBtn onClick={() => templateExecCmd('insertUnorderedList')} icon={List} label="Bullet List" />
                               </div>
                               <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 dark:border-slate-600 flex-shrink-0">
                                 <button
                                   type="button"
                                   onClick={() => templateImageInputRef.current?.click()}
                                   className="p-1.5 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 rounded transition-colors dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                                   title="Insert Image"
                                 >
                                   <ImageIcon size={16} strokeWidth={2.5} />
                                 </button>
                                 <input
                                   ref={templateImageInputRef}
                                   type="file"
                                   accept="image/*"
                                   onChange={handleTemplateImageUpload}
                                   className="hidden"
                                 />
                                 <ToolbarBtn onClick={() => { const url = prompt('Enter link URL:'); if (url) templateExecCmd('createLink', url); }} icon={LinkIcon} label="Insert Link" />
                               </div>
                               {/* HTML Source Toggle */}
                               <div className="flex items-center gap-0.5 flex-shrink-0">
                                 <button
                                   type="button"
                                   onClick={toggleTemplateSourceMode}
                                   className={`p-1.5 rounded transition-colors ${templateSourceMode ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-200 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}
                                   title={templateSourceMode ? 'Switch to Visual Editor' : 'Edit HTML Source (Advanced)'}
                                 >
                                   <Code size={16} strokeWidth={2.5} />
                                 </button>
                               </div>
                             </div>

                             {/* Editable Area */}
                             {templateSourceMode ? (
                               <textarea
                                 value={templateSourceCode}
                                 onChange={(e) => setTemplateSourceCode(e.target.value)}
                                 className="w-full p-5 h-72 focus:outline-none overflow-y-auto bg-slate-950 text-emerald-400 font-mono text-sm leading-relaxed resize-none"
                                 placeholder="Edit raw HTML here (advanced)..."
                                 spellCheck={false}
                               />
                             ) : (
                               <div
                                 ref={templateEditorRef}
                                 contentEditable
                                 onInput={handleTemplateEditorInput}
                                 className="w-full p-5 h-72 focus:outline-none overflow-y-auto bg-white text-slate-700 dark:bg-slate-900 dark:text-white prose dark:prose-invert max-w-none font-sans text-sm"
                                 style={{ minHeight: '288px' }}
                                 suppressContentEditableWarning={true}
                                 data-placeholder="Type your template content here... Add text, images, and formatting!"
                               >
                               </div>
                             )}

                             <div className="bg-slate-50 border-t border-slate-200 p-1.5 flex justify-between items-center px-4 dark:bg-slate-900 dark:border-slate-800">
                               <span className="text-xs text-slate-400">
                                 {templateSourceMode ? '⚡ HTML Source (Advanced)' : '✏️ Visual Editor — type, format, and insert images'}
                               </span>
                             </div>
                           </div>

                           <div className="flex items-center gap-3 pt-2">
                             <button
                               onClick={handleSaveEmailTemplate}
                               disabled={!templateFormName.trim() || isSavingTemplate}
                               className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                             >
                               {isSavingTemplate ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> {editingTemplate ? 'Update' : 'Create'}</>}
                             </button>
                             <button
                               onClick={cancelTemplateForm}
                               className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                             >
                               Cancel
                             </button>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Template List Grid */}
                     {!isCreatingTemplate && !editingTemplate && (
                       emailTemplates.length === 0 ? (
                         <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl dark:border-slate-800">
                           <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center mx-auto mb-4">
                             <Mail size={24} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                           </div>
                           <p className="text-sm font-black text-slate-900 dark:text-white">No Email Templates Yet</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Create beautiful custom email templates for bulletins, events, or announcements.</p>
                           <button
                             onClick={startCreateTemplate}
                             className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all dark:bg-indigo-500 dark:hover:bg-indigo-600"
                           >
                             <Plus size={12} /> Create First Template
                           </button>
                         </div>
                       ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-enter">
                           {emailTemplates.map(template => {
                             // Assign beautiful visual gradient header based on template name
                             const nameLower = template.name.toLowerCase();
                             let cardGradient = 'from-indigo-500 to-purple-600 dark:from-indigo-750 dark:to-purple-850';
                             let label = 'Announcement';

                             if (nameLower.includes('bulletin') || nameLower.includes('weekly')) {
                               cardGradient = 'from-violet-500 to-indigo-600 dark:from-violet-750 dark:to-indigo-850';
                               label = 'Weekly Bulletin';
                             } else if (nameLower.includes('event') || nameLower.includes('invitation') || nameLower.includes('service') || nameLower.includes('announcement')) {
                               cardGradient = 'from-rose-500 to-orange-500 dark:from-rose-750 dark:to-orange-850';
                               label = 'Event & Invitation';
                             } else if (nameLower.includes('birthday') || nameLower.includes('anniversary') || nameLower.includes('happy')) {
                               cardGradient = 'from-pink-500 to-rose-500 dark:from-pink-750 dark:to-rose-850';
                               label = 'Milestone Celebration';
                             } else if (nameLower.includes('welcome') || nameLower.includes('new') || nameLower.includes('member')) {
                               cardGradient = 'from-teal-500 to-emerald-500 dark:from-teal-750 dark:to-emerald-850';
                               label = 'Welcome Message';
                             }

                             const plainSnippet = template.body ? template.body.replace(/<[^>]+>/g, ' ').substring(0, 100) + '...' : '(Empty)';

                             return (
                               <div
                                 key={template.id}
                                 className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group"
                               >
                                 {/* Visual Header Banner */}
                                 <div className={`px-5 py-4 bg-gradient-to-r ${cardGradient} text-white relative overflow-hidden flex-shrink-0`}>
                                   <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                                     <Mail size={80} strokeWidth={1} />
                                   </div>
                                   <span className="inline-flex px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md mb-2">
                                     {label}
                                   </span>
                                   <h4 className="text-sm font-black truncate max-w-full leading-tight drop-shadow-sm">{template.name}</h4>
                                 </div>

                                 <div className="p-5 flex-1 flex flex-col justify-between">
                                   <div className="mb-4">
                                     <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Default Subject</span>
                                     <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">{template.subject || '(No default subject)'}</p>
                                     
                                     <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 mt-3">Preview Snippet</span>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{plainSnippet}</p>
                                   </div>

                                   {/* Action buttons */}
                                   <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-850">
                                     <button
                                       type="button"
                                       onClick={() => setPreviewingTemplate(template)}
                                       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 transition-colors text-[11px] font-black uppercase tracking-wider"
                                     >
                                       <Eye size={12} strokeWidth={2.5} /> Preview
                                     </button>
                                     <div className="flex items-center gap-1.5">
                                       <button
                                         type="button"
                                         onClick={() => startEditTemplate(template)}
                                         className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 transition-colors"
                                         title="Edit Template"
                                       >
                                         <Edit3 size={14} />
                                       </button>
                                       <button
                                         type="button"
                                         onClick={() => handleDeleteEmailTemplate(template.id)}
                                         className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 dark:hover:text-rose-450 transition-colors"
                                         title="Delete Template"
                                       >
                                         <Trash2 size={14} />
                                       </button>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       )
                     )}

                     {/* Template Preview Modal */}
                     {previewingTemplate && (
                       <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-enter" onClick={() => setPreviewingTemplate(null)}>
                         <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden mx-4" onClick={(e) => e.stopPropagation()}>
                           <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                             <div>
                               <h4 className="text-sm font-bold text-slate-900 dark:text-white">{previewingTemplate.name}</h4>
                               <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Subject: {previewingTemplate.subject}</p>
                             </div>
                             <button onClick={() => setPreviewingTemplate(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                               <X size={18} className="text-slate-500" />
                             </button>
                           </div>
                           <div className="p-6 overflow-y-auto max-h-[calc(85vh-72px)]">
                             <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                               <iframe
                                 srcDoc={previewingTemplate.body}
                                 title="Template Preview"
                                 className="w-full h-[500px] border-0"
                                 sandbox="allow-same-origin"
                               />
                             </div>
                           </div>
                         </div>
                       </div>
                     )}

                   </div>
                 )}
               </div>
             )}
             
             {/* COMPONENT: HISTORY */}
             {activeTab === 'history' && (
                 <div className="animate-enter space-y-6">
                    <div className="flex items-center gap-2 px-2">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Recent Activity</h3>
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            </div>
            
            <div className="relative pl-6 border-l-2 border-slate-200/60 dark:border-slate-800 space-y-6 ml-4">
                {messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 -ml-6">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold">No message history yet.</p>
                    </div>
                ) : (
                    paginatedMessages.map((msg) => {
                        const isEmail = msg.channel === 'email';
                        return (
                            <div key={msg.id} className="relative group animate-enter">
                                {/* Timeline Dot Node */}
                                <div className={`absolute -left-[31px] top-4 w-4 h-4 rounded-full border-2 border-slate-50 dark:border-slate-950 flex items-center justify-center z-10 transition-all duration-300 group-hover:scale-125 ${
                                  isEmail 
                                    ? 'bg-indigo-500 ring-4 ring-indigo-500/10' 
                                    : 'bg-emerald-500 ring-4 ring-emerald-500/10'
                                }`}>
                                </div>

                                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 rounded-3xl border border-slate-200/50 hover:border-indigo-100 dark:hover:border-indigo-900/40 hover:shadow-lg hover:shadow-slate-100/30 dark:hover:shadow-none transition-all duration-300">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`p-2 rounded-xl flex items-center justify-center ${isEmail ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-emerald-50 text-emerald-600 dark:bg-[#10b981]/15 dark:text-[#34d399]'}`}>
                                            {isEmail ? <Mail size={14} strokeWidth={2.5} /> : <Smartphone size={14} strokeWidth={2.5} />}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            <Clock size={11} />
                                            <span>{new Date(msg.sentAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    
                                    {msg.subject && (
                                        <h4 className="font-extrabold text-xs text-slate-900 mb-1.5 dark:text-white line-clamp-1 leading-snug">{msg.subject}</h4>
                                    )}
                                    
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 dark:text-slate-450 leading-relaxed">{msg.content.replace(/<[^>]+>/g, '')}</p>

                                    {msg.attachments && msg.attachments.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-4">
                                        {msg.attachments.map((att: any, i: number) => (
                                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-[10px] font-semibold text-slate-550 border border-slate-100 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400">
                                            <Paperclip size={10} /> {att.filename}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-850">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            <Users size={11} />
                                            <span className="truncate max-w-[120px]">{msg.recipientLabel}</span>
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30">
                                            {msg.recipientCount} Sent
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
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
             )}
          </div>
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
