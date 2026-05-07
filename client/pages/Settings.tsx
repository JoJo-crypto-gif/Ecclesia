import React, { useState, useEffect, useRef } from 'react';
import { Upload, ImageIcon, RotateCcw, User, ShieldCheck, School, Zap, BellRing, Settings as SettingsIcon } from 'lucide-react';

const parseBoolean = (value: unknown, fallback = true) => {
  if (value === null || value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
};

const Settings: React.FC = () => {
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
  const [userRole, setUserRole] = useState<'admin' | 'zone_leader' | null>(null);

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
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'automation'>('profile');

  const loadAutomationSettings = async () => {
    setAutomationMessage('');
    setAutomationStatus('loading');
    try {
      const res = await fetch('/api/settings', { credentials: 'include' });
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
      setAutomationStatus('idle');
    } catch {
      setAutomationStatus('error');
      setAutomationMessage('Failed to load automation settings.');
    }
  };

  useEffect(() => {
    // Load current profile
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setName(data.data.name || '');
            setEmail(data.data.email || '');
            setUserRole(data.data.role || null);
            if (data.data.role === 'admin') {
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
      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email }),
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

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        <div className="w-full lg:w-72 space-y-2 lg:sticky lg:top-24">
          <button onClick={() => setActiveTab('profile')} className={tabClass('profile')}>
            <User size={18} />
            <span>Profile & Security</span>
          </button>
          
          {userRole === 'admin' && (
            <>
              <button onClick={() => setActiveTab('branding')} className={tabClass('branding')}>
                <School size={18} />
                <span>Church Branding</span>
              </button>
              <button onClick={() => setActiveTab('automation')} className={tabClass('automation')}>
                <Zap size={18} />
                <span>Automation</span>
              </button>
            </>
          )}
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

          {activeTab === 'branding' && userRole === 'admin' && (
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

          {activeTab === 'automation' && userRole === 'admin' && (
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

                {automationMessage && (
                  <div className={`p-4 rounded-xl text-sm font-bold mt-4 ${automationStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                    {automationMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAutomationBusy}
                  className="w-full mt-6 bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-lg dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  {automationStatus === 'saving' ? 'Saving Configuration...' : 'Save Automation Settings'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
