import React, { useState, useEffect, useRef } from 'react';
import { Upload, ImageIcon, RotateCcw, User, ShieldCheck, School, Zap, BellRing, Settings as SettingsIcon, Users, Trash2, Plus, Search, Loader2, ChevronDown } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const parseBoolean = (value: unknown, fallback = true) => {
  if (value === null || value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
};

const Settings: React.FC = () => {
  const { hasPermission } = useAuth();

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [passwordMessage, setPasswordMessage] = useState('');

  // Profile State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('loading');
  const [profileMessage, setProfileMessage] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userMfaEnabled, setUserMfaEnabled] = useState(false);
  const canManageSettings =
    userRole === 'admin' ||
    hasPermission('settings', 'create') ||
    hasPermission('settings', 'edit') ||
    hasPermission('settings', 'delete');

  // Church Branding State (Admin Only)
  const [churchName, setChurchName] = useState('Ecclesia');
  const [churchLogo, setChurchLogo] = useState('');
  const [brandingStatus, setBrandingStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [brandingMessage, setBrandingMessage] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Automation Settings State (Admin Only)
  const [automationStatus, setAutomationStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');
  const [automationMessage, setAutomationMessage] = useState('');
  const [automationSettings, setAutomationSettings] = useState({
    automatedSmsEnabled: true,
    birthdaySmsEnabled: true,
    anniversarySmsEnabled: true,
    absenteeSmsEnabled: true
  });
  
  // MFA Settings State (Admin Only)
  const [mfaSettings, setMfaSettings] = useState({
    mode: 'optional',
    enforcedRoles: [] as string[]
  });
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'automation' | 'security' | 'roles' | 'users'>('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState('');
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Users Management State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    memberId: '',
    roleId: '',
    email: '',
    password: '',
    name: ''
  });
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const loadAutomationSettings = async () => {
    setAutomationMessage('');
    setAutomationStatus('loading');
    try {
      const res = await apiFetch('/api/settings');
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        setAutomationStatus('error');
        setAutomationMessage(data?.error?.message || 'Failed to load automation settings.');
        return;
      }

      const settings = data.data || {};
      // Load branding
      if (settings.church_name) setChurchName(settings.church_name);
      if (settings.church_logo) setChurchLogo(settings.church_logo);
      // Load automation
      setAutomationSettings({
        automatedSmsEnabled: parseBoolean(settings.automated_sms_enabled, true),
        birthdaySmsEnabled: parseBoolean(settings.birthday_sms_enabled, true),
        anniversarySmsEnabled: parseBoolean(settings.anniversary_sms_enabled, true),
        absenteeSmsEnabled: parseBoolean(settings.absentee_sms_enabled, true)
      });
      // Load MFA settings
      let enforcedRoles = [];
      try {
        enforcedRoles = settings.mfa_enforced_roles ? JSON.parse(settings.mfa_enforced_roles) : [];
      } catch (e) {}
      
      setMfaSettings({
        mode: settings.mfa_mode || 'optional',
        enforcedRoles
      });
      
      setAutomationStatus('idle');
    } catch {
      setAutomationStatus('error');
      setAutomationMessage('Failed to load settings.');
    }
  };

  const loadRoles = async () => {
    setLoadingRoles(true);
    setRolesError('');
    try {
      const res = await apiFetch('/api/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
      } else {
        setRolesError(data.error?.message || 'Failed to load roles.');
      }
    } catch {
      setRolesError('Failed to load roles.');
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const res = await apiFetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setUsersError(data.error?.message || 'Failed to load users.');
      }
    } catch {
      setUsersError('Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const searchMembers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchingMembers(true);
    try {
      const res = await apiFetch(`/api/members?search=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setSearchingMembers(false);
    }
  };

  useEffect(() => {
    // Load current profile
    const loadProfile = async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setName(data.data.name || '');
            setEmail(data.data.email || '');
            setUserRole(data.data.role || null);
            setUserMfaEnabled(data.data.mfaEnabled || false);
            const hasSettingsAccess = Boolean(
              data.data.role === 'admin' ||
              data.data.permissions?.settings?.create ||
              data.data.permissions?.settings?.edit ||
              data.data.permissions?.settings?.delete
            );
            if (hasSettingsAccess) {
              await loadAutomationSettings();
            }
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setProfileStatus('idle');
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'roles') {
      loadRoles();
    }
    if (activeTab === 'users') {
      loadUsers();
      if (roles.length === 0) loadRoles(); // Need roles for the user modal
    }
    if (activeTab === 'security') {
      if (roles.length === 0) loadRoles(); // Need roles for the enforced roles list
    }
  }, [activeTab]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (!currentPassword || !newPassword) {
      setPasswordStatus('error');
      setPasswordMessage('Please fill all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('error');
      setPasswordMessage('New passwords do not match.');
      return;
    }

    setPasswordStatus('saving');
    try {
      const res = await apiFetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordStatus('error');
        setPasswordMessage(data?.error?.message || 'Failed to update password');
        return;
      }
      setPasswordStatus('success');
      setPasswordMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordStatus('error');
      setPasswordMessage('Failed to update password');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');

    if (!name || !email) {
      setProfileStatus('error');
      setProfileMessage('Please fill your name and email.');
      return;
    }

    setProfileStatus('saving');
    try {
      const res = await apiFetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mfaEnabled: userMfaEnabled }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileStatus('error');
        setProfileMessage(data?.error?.message || 'Failed to update profile');
        return;
      }
      setProfileStatus('success');
      setProfileMessage('Profile updated successfully.');
      // Reload to update navbar/sidebar context
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setProfileStatus('error');
      setProfileMessage('Failed to update profile');
    }
  };

  const handleAutomationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAutomationMessage('');
    setAutomationStatus('saving');

    try {
      const payload = {
        automated_sms_enabled: String(automationSettings.automatedSmsEnabled),
        birthday_sms_enabled: String(automationSettings.birthdaySmsEnabled),
        anniversary_sms_enabled: String(automationSettings.anniversarySmsEnabled),
        absentee_sms_enabled: String(automationSettings.absenteeSmsEnabled)
      };

      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        setAutomationStatus('error');
        setAutomationMessage(data?.error?.message || 'Failed to update automation settings.');
        return;
      }

      setAutomationStatus('success');
      setAutomationMessage('Automation settings updated successfully.');
      setTimeout(() => setAutomationStatus('idle'), 1500);
    } catch {
      setAutomationStatus('error');
      setAutomationMessage('Failed to update automation settings.');
    }
  };

  const toggleAutomationSetting = (key: 'automatedSmsEnabled' | 'birthdaySmsEnabled' | 'anniversarySmsEnabled' | 'absenteeSmsEnabled') => {
    setAutomationSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isGlobalDisabled = !automationSettings.automatedSmsEnabled;
  const isAutomationBusy = automationStatus === 'loading' || automationStatus === 'saving';

  const [mfaStatus, setMfaStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [mfaMessage, setMfaMessage] = useState('');

  const handleMfaSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaMessage('');
    setMfaStatus('saving');

    try {
      const payload = {
        mfa_mode: mfaSettings.mode,
        mfa_enforced_roles: JSON.stringify(mfaSettings.enforcedRoles)
      };

      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        setMfaStatus('error');
        setMfaMessage(data?.error?.message || 'Failed to update MFA settings.');
        return;
      }

      setMfaStatus('success');
      setMfaMessage('MFA settings updated successfully.');
      setTimeout(() => setMfaStatus('idle'), 1500);
    } catch {
      setMfaStatus('error');
      setMfaMessage('Failed to update MFA settings.');
    }
  };

  // --- Branding Handlers ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      // Resize to max 200x200 via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setChurchLogo(canvas.toDataURL('image/png'));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so re-uploading the same file triggers onChange
    e.target.value = '';
  };

  const handleBrandingSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandingMessage('');
    setBrandingStatus('saving');
    try {
      const payload: Record<string, string> = {
        church_name: churchName.trim() || 'Ecclesia',
      };
      // Only send logo if it's a data URL (or empty to reset)
      payload.church_logo = churchLogo;

      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setBrandingStatus('error');
        setBrandingMessage(data?.error?.message || 'Failed to save branding.');
        return;
      }
      setBrandingStatus('success');
      setBrandingMessage('Branding updated! Reloading...');
      // Reload to propagate to sidebar
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setBrandingStatus('error');
      setBrandingMessage('Failed to save branding.');
    }
  };

  const toggleButtonClass = (enabled: boolean, disabled = false) => (
    `relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
      enabled
        ? 'bg-indigo-600 dark:bg-indigo-500'
        : 'bg-slate-300 dark:bg-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
  );

  const tabClass = (tab: typeof activeTab) => 
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
      activeTab === tab 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 dark:bg-indigo-500' 
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
    }`;

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email || !userForm.password || !userForm.roleId) return;

    setSavingUser(true);
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsUserModalOpen(false);
        setUserForm({ memberId: '', roleId: '', email: '', password: '', name: '' });
        setMemberSearch('');
        loadUsers();
      } else {
        alert(data.error?.message || 'Failed to save user.');
      }
    } catch (err) {
      alert('Failed to save user.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user? They will lose all access.')) return;
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadUsers();
      } else {
        alert(data.error?.message || 'Failed to delete user.');
      }
    } catch {
      alert('Failed to delete user.');
    }
  };

  const handleToggleUserMfa = async (id: string, currentMfa: boolean) => {
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaEnabled: !currentMfa }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.id === id ? { ...u, mfaEnabled: !currentMfa } : u));
      } else {
        alert(data.error?.message || 'Failed to update MFA status.');
      }
    } catch {
      alert('Failed to update MFA status.');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile & Security', icon: User },
    ...(canManageSettings ? [
      { id: 'branding', label: 'Church Branding', icon: School },
      { id: 'automation', label: 'Automation Hub', icon: Zap },
      { id: 'security', label: 'Security & MFA', icon: ShieldCheck },
      { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
      { id: 'users', label: 'User Management', icon: Users },
    ] : [])
  ] as const;

  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="max-w-6xl animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg dark:bg-indigo-500/10 dark:text-indigo-400">
            <SettingsIcon size={24} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Account Settings</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400">Manage your personal profile and church configurations.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-72 lg:sticky lg:top-24 space-y-4">
          {/* Mobile Custom Dropdown */}
          <div className="block lg:hidden relative">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full h-[54px] px-5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-white flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <activeTabData.icon size={18} className="text-indigo-600 dark:text-indigo-400" />
                <span>{activeTabData.label}</span>
              </div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isMobileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-enter">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-4 text-left font-bold transition-all ${
                        activeTab === tab.id
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <tab.icon size={18} className={activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop Tabs */}
          <div className="hidden lg:block space-y-2">
            <button onClick={() => setActiveTab('profile')} className={tabClass('profile')}>
              <User size={18} />
              <span>Profile & Security</span>
            </button>
            
            {canManageSettings && (
              <>
                <button onClick={() => setActiveTab('branding')} className={tabClass('branding')}>
                  <School size={18} />
                  <span>Church Branding</span>
                </button>
                <button onClick={() => setActiveTab('automation')} className={tabClass('automation')}>
                  <Zap size={18} />
                  <span>Automation Hub</span>
                </button>
                <button onClick={() => setActiveTab('security')} className={tabClass('security')}>
                  <ShieldCheck size={18} />
                  <span>Security & MFA</span>
                </button>
                <button onClick={() => setActiveTab('roles')} className={tabClass('roles')}>
                  <ShieldCheck size={18} />
                  <span>Roles & Permissions</span>
                </button>
                <button onClick={() => setActiveTab('users')} className={tabClass('users')}>
                  <Users size={18} />
                  <span>User Management</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full min-w-0">
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-enter">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">Profile Information</h2>
                </div>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 dark:text-slate-300">Display Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="Your full name"
                        required
                        disabled={profileStatus === 'loading'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 dark:text-slate-300">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="Your work email"
                        required
                        disabled={profileStatus === 'loading'}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-5 mt-6 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <div className="pr-4">
                      <p className="font-bold text-slate-800 dark:text-white">Two-Factor Authentication (MFA)</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Require an email security code when signing in.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUserMfaEnabled(!userMfaEnabled)}
                      disabled={profileStatus === 'loading' || profileStatus === 'saving'}
                      className={toggleButtonClass(userMfaEnabled, profileStatus === 'loading' || profileStatus === 'saving')}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${userMfaEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {profileMessage && (
                    <div className={`p-4 rounded-xl text-sm font-bold ${profileStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                      {profileMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={profileStatus === 'saving' || profileStatus === 'loading'}
                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    {profileStatus === 'saving' ? 'Updating Profile...' : 'Save Profile Changes'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">Security & Password</h2>
                </div>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2 dark:text-slate-300">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="Verify current password"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 dark:text-slate-300">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="At least 8 characters"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 dark:text-slate-300">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="Repeat new password"
                        required
                      />
                    </div>
                  </div>

                  {passwordMessage && (
                    <div className={`p-4 rounded-xl text-sm font-bold ${passwordStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                      {passwordMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordStatus === 'saving'}
                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-lg dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <ShieldCheck size={18} />
                    {passwordStatus === 'saving' ? 'Updating Password...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'branding' && canManageSettings && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-enter">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Church Branding</h2>
              </div>
              <p className="text-sm text-slate-500 mb-8 dark:text-slate-400">
                Customize your organization's presence across the platform.
              </p>
              
              <form onSubmit={handleBrandingSave} className="space-y-8">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Church / Organization Name</label>
                  <input
                    type="text"
                    value={churchName}
                    onChange={e => setChurchName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="e.g. Grace Community Church"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Organization Logo</label>
                  <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden dark:bg-slate-900 dark:border-slate-700">
                      {churchLogo ? (
                        <img src={churchLogo} alt="Logo preview" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon size={32} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-white border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-all dark:bg-slate-800 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                      >
                        <Upload size={16} /> Upload New Logo
                      </button>
                      {churchLogo && (
                        <button
                          type="button"
                          onClick={() => setChurchLogo('')}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-rose-600 transition-colors"
                        >
                          <RotateCcw size={16} /> Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Square images work best. Max size 2MB.</p>
                </div>

                {brandingMessage && (
                  <div className={`p-4 rounded-xl text-sm font-bold ${brandingStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                    {brandingMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={brandingStatus === 'saving'}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  {brandingStatus === 'saving' ? 'Saving Changes...' : 'Update Branding'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'automation' && canManageSettings && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-enter">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Automation Hub</h2>
              </div>
              <p className="text-sm text-slate-500 mb-8 dark:text-slate-400">
                Configure smart notifications and engagement workflows.
              </p>

              <form onSubmit={handleAutomationSubmit} className="space-y-4">
                <div className="flex items-center justify-between p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/20">
                  <div className="flex gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl h-fit dark:bg-indigo-500/20 dark:text-indigo-400">
                      <BellRing size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Master Switch</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Enable or disable all automated SMS communications.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAutomationSetting('automatedSmsEnabled')}
                    disabled={isAutomationBusy}
                    className={toggleButtonClass(automationSettings.automatedSmsEnabled, isAutomationBusy)}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${automationSettings.automatedSmsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-6">
                  {[
                    { key: 'birthdaySmsEnabled', label: 'Birthday Greetings', desc: 'Auto-send daily SMS to members celebrating birthdays.' },
                    { key: 'anniversarySmsEnabled', label: 'Wedding Anniversaries', desc: 'Auto-send daily SMS to members celebrating anniversaries.' },
                    { key: 'absenteeSmsEnabled', label: 'Absentee Follow-up', desc: 'Weekly smart check-ins for members missing consecutive services.' }
                  ].map((item) => (
                    <div key={item.key} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isGlobalDisabled ? 'opacity-50 grayscale' : 'bg-white dark:bg-slate-800'} border-slate-200 dark:border-slate-700`}>
                      <div className="pr-4">
                        <p className="font-bold text-slate-800 dark:text-white">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleAutomationSetting(item.key as any)}
                        disabled={isAutomationBusy || isGlobalDisabled}
                        className={toggleButtonClass(automationSettings[item.key as keyof typeof automationSettings], isAutomationBusy || isGlobalDisabled)}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${automationSettings[item.key as keyof typeof automationSettings] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    disabled={isAutomationBusy}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                  >
                    {isAutomationBusy ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>
              
              {automationMessage && (
                <div className={`mt-4 p-4 rounded-xl text-sm border ${automationStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                  {automationMessage}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && canManageSettings && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-enter">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Security & MFA</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                Configure Multi-Factor Authentication (MFA) requirements for the platform.
              </p>

              <form onSubmit={handleMfaSettingsSubmit}>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">MFA Enforcement Level</label>
                    <select
                      value={mfaSettings.mode}
                      onChange={(e) => setMfaSettings({ ...mfaSettings, mode: e.target.value })}
                      className="w-full h-[50px] px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
                    >
                      <option value="off">Disabled Globally</option>
                      <option value="optional">Optional (Users can opt-in)</option>
                      <option value="enforced">Enforced (Required for selected roles)</option>
                    </select>
                  </div>

                  {mfaSettings.mode === 'enforced' && (
                    <div className="p-6 border border-indigo-100 bg-indigo-50/30 rounded-2xl dark:border-indigo-500/20 dark:bg-indigo-500/5">
                      <p className="text-sm font-bold text-slate-800 dark:text-white mb-4">Enforced Roles</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {roles.map((role) => (
                          <label key={role.id} className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all ${mfaSettings.enforcedRoles.includes(role.id) ? 'bg-white border-indigo-200 shadow-sm shadow-indigo-100 dark:bg-slate-800 dark:border-indigo-500/30' : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-indigo-200 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-500/30'}`}>
                            <input
                              type="checkbox"
                              checked={mfaSettings.enforcedRoles.includes(role.id)}
                              onChange={(e) => {
                                const newRoles = e.target.checked 
                                  ? [...mfaSettings.enforcedRoles, role.id]
                                  : mfaSettings.enforcedRoles.filter(id => id !== role.id);
                                setMfaSettings({ ...mfaSettings, enforcedRoles: newRoles });
                              }}
                              className="appearance-none w-6 h-6 rounded-xl border-2 border-slate-300 bg-white cursor-pointer transition-all dark:border-slate-600 dark:bg-slate-700 checked:bg-indigo-600 checked:border-indigo-600 dark:checked:bg-indigo-500 dark:checked:border-indigo-500 shadow-sm"
                            />
                            <span className={`text-sm font-semibold transition-colors ${mfaSettings.enforcedRoles.includes(role.id) ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>
                              {role.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    disabled={mfaStatus === 'saving'}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                  >
                    {mfaStatus === 'saving' ? 'Saving...' : 'Save Security Settings'}
                  </button>
                </div>
              </form>

              {mfaMessage && (
                <div className={`mt-4 p-4 rounded-xl text-sm border ${mfaStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                  {mfaMessage}
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && canManageSettings && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-enter">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">Roles & Permissions</h2>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Create custom roles with granular access controls.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setEditingRole({ 
                      name: '', 
                      description: '', 
                      permissions: {
                        dashboard: { read: true, create: false, edit: false, delete: false },
                        members: { read: true, create: false, edit: false, delete: false },
                        attendance: { read: true, create: false, edit: false, delete: false },
                        events: { read: true, create: false, edit: false, delete: false },
                        zones: { read: true, create: false, edit: false, delete: false },
                        reports: { read: true, create: false, edit: false, delete: false },
                        messaging: { read: true, create: false, edit: false, delete: false },
                        settings: { read: true, create: false, edit: false, delete: false }
                      } 
                    });
                    setIsRoleModalOpen(true);
                  }}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <SettingsIcon size={18} />
                  <span>New Role</span>
                </button>
              </div>

              {loadingRoles ? (
                <div className="text-center py-12 text-slate-400">Loading roles...</div>
              ) : rolesError ? (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20">
                  {rolesError}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map((role) => (
                    <div key={role.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 dark:bg-slate-800 dark:border-slate-700 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 dark:text-white capitalize">{role.name}</h3>
                          {role.is_system && (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-md dark:bg-slate-700 dark:text-slate-400 tracking-tighter">System</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">{role.description || 'No description provided.'}</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingRole(role);
                              setIsRoleModalOpen(true);
                            }}
                            className="text-indigo-600 text-xs font-black uppercase tracking-wider hover:underline dark:text-indigo-400"
                          >
                            Edit Permissions
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && canManageSettings && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-enter">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">User Management</h2>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Grant system access to church members.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setUserForm({ memberId: '', roleId: '', email: '', password: '', name: '' });
                    setMemberSearch('');
                    setIsUserModalOpen(true);
                  }}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Plus size={18} />
                  <span>Add User</span>
                </button>
              </div>

              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Loading users...</span>
                </div>
              ) : usersError ? (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20">
                  {usersError}
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-hidden w-full border border-slate-100 rounded-2xl dark:border-slate-800">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px]">User</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px]">Role</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px]">Joined</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px]">MFA</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs dark:bg-indigo-500/20 dark:text-indigo-400">
                                {user.firstName?.[0] || user.name?.[0] || user.email[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-white">
                                  {user.firstName ? `${user.firstName} ${user.lastName}` : (user.name || 'No Name')}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {user.roleName || user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleUserMfa(user.id, user.mfaEnabled)}
                              className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${user.mfaEnabled ? 'bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-400' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400'}`}
                            >
                              {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Remove User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Management Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Add New User</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Link a member to a system role.</p>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit}>
              <div className="p-8 space-y-6">
                {/* Member Search */}
                <div className="relative">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Search Member</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        searchMembers(e.target.value);
                      }}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      placeholder="Type name to search..."
                    />
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {(searchResults.length > 0 || searchingMembers) && (
                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                      {searchingMembers ? (
                        <div className="p-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin" size={16} /> Searching...
                        </div>
                      ) : (
                        searchResults.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setUserForm({
                                ...userForm,
                                memberId: m.id,
                                email: m.email || '',
                                name: `${m.firstName} ${m.lastName}`
                              });
                              setMemberSearch(`${m.firstName} ${m.lastName}`);
                              setSearchResults([]);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between border-b border-slate-50 dark:border-slate-700 last:border-0"
                          >
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white">{m.firstName} {m.lastName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{m.email || 'No email'}</p>
                            </div>
                            <Plus size={16} className="text-indigo-500" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Assign Role</label>
                    <select 
                      value={userForm.roleId}
                      onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white appearance-none"
                    >
                      <option value="">Select a role...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Login Email</label>
                    <input 
                      type="email" 
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Initial Password</label>
                    <input 
                      type="password" 
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingUser}
                  className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  {savingUser && <Loader2 size={18} className="animate-spin" />}
                  {savingUser ? 'Creating Account...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {editingRole.id ? 'Edit Role' : 'Create New Role'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Define access rights for this role.</p>
              </div>
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Role Name</label>
                  <input 
                    type="text" 
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    disabled={editingRole.is_system}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
                    placeholder="e.g. Secretary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
                  <input 
                    type="text" 
                    value={editingRole.description}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="Brief role description..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Module Permissions</label>
                <div className="overflow-x-auto overflow-y-hidden w-full border border-slate-100 rounded-2xl dark:border-slate-800">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px]">Module</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px] text-center">Read</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px] text-center">Create</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px] text-center">Edit</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-tighter text-[10px] text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {Object.keys(editingRole.permissions || {}).map((module) => (
                        <tr key={module} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 capitalize">{module}</td>
                          {['read', 'create', 'edit', 'delete'].map((action) => (
                            <td key={action} className="px-6 py-4 text-center">
                              <input 
                                type="checkbox"
                                checked={editingRole.permissions[module][action]}
                                onChange={(e) => {
                                  const updatedPerms = { ...editingRole.permissions };
                                  updatedPerms[module][action] = e.target.checked;
                                  setEditingRole({ ...editingRole, permissions: updatedPerms });
                                }}
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setLoadingRoles(true);
                  try {
                    const method = editingRole.id ? 'PUT' : 'POST';
                    const url = editingRole.id ? `/api/roles/${editingRole.id}` : '/api/roles';
                    const res = await apiFetch(url, {
                      method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editingRole)
                    });
                    const data = await res.json();
                    if (data.success) {
                      loadRoles();
                      setIsRoleModalOpen(false);
                    } else {
                      alert(data.error?.message || 'Failed to save role');
                    }
                  } catch {
                    alert('An error occurred');
                  } finally {
                    setLoadingRoles(false);
                  }
                }}
                className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
              >
                {editingRole.id ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
