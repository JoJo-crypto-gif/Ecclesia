import React, { useState, useEffect } from 'react';

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

  // Automation Settings State (Admin Only)
  const [automationStatus, setAutomationStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');
  const [automationMessage, setAutomationMessage] = useState('');
  const [automationSettings, setAutomationSettings] = useState({
    automatedSmsEnabled: true,
    birthdaySmsEnabled: true,
    anniversarySmsEnabled: true,
    absenteeSmsEnabled: true
  });

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

  const toggleButtonClass = (enabled: boolean, disabled = false) => (
    `relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
      enabled
        ? 'bg-indigo-600 dark:bg-indigo-500'
        : 'bg-slate-300 dark:bg-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
  );

  return (
    <div className="max-w-5xl space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">Manage your account settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Profile Information</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="Enter your name"
              required
              disabled={profileStatus === 'loading'}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="Enter your email"
              required
              disabled={profileStatus === 'loading'}
            />
          </div>

          {profileMessage && (
            <div className={`text-sm font-semibold ${profileStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {profileMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={profileStatus === 'saving' || profileStatus === 'loading'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {profileStatus === 'saving' ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="Enter new password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="Confirm new password"
              required
            />
          </div>

          {passwordMessage && (
            <div className={`text-sm font-semibold ${passwordStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {passwordMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordStatus === 'saving'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {passwordStatus === 'saving' ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
      </div>

      {userRole === 'admin' && (
        <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Automation Messages</h2>
          <p className="text-sm text-slate-500 mb-5 dark:text-slate-400">
            Control automated SMS dispatch for birthdays, anniversaries, and absentees.
          </p>

          <form onSubmit={handleAutomationSubmit} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">Automated Messages</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Master switch for all automated SMS.</p>
              </div>
              <button
                type="button"
                onClick={() => toggleAutomationSetting('automatedSmsEnabled')}
                disabled={isAutomationBusy}
                className={toggleButtonClass(automationSettings.automatedSmsEnabled, isAutomationBusy)}
                aria-pressed={automationSettings.automatedSmsEnabled}
                aria-label="Toggle automated messages"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    automationSettings.automatedSmsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">Birthday Messages</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Send daily birthday SMS from template.</p>
              </div>
              <button
                type="button"
                onClick={() => toggleAutomationSetting('birthdaySmsEnabled')}
                disabled={isAutomationBusy || isGlobalDisabled}
                className={toggleButtonClass(automationSettings.birthdaySmsEnabled, isAutomationBusy || isGlobalDisabled)}
                aria-pressed={automationSettings.birthdaySmsEnabled}
                aria-label="Toggle birthday messages"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    automationSettings.birthdaySmsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">Anniversary Messages</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Send daily wedding anniversary SMS.</p>
              </div>
              <button
                type="button"
                onClick={() => toggleAutomationSetting('anniversarySmsEnabled')}
                disabled={isAutomationBusy || isGlobalDisabled}
                className={toggleButtonClass(automationSettings.anniversarySmsEnabled, isAutomationBusy || isGlobalDisabled)}
                aria-pressed={automationSettings.anniversarySmsEnabled}
                aria-label="Toggle anniversary messages"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    automationSettings.anniversarySmsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">Absentee Messages</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Send weekly follow-up SMS to absentees.</p>
              </div>
              <button
                type="button"
                onClick={() => toggleAutomationSetting('absenteeSmsEnabled')}
                disabled={isAutomationBusy || isGlobalDisabled}
                className={toggleButtonClass(automationSettings.absenteeSmsEnabled, isAutomationBusy || isGlobalDisabled)}
                aria-pressed={automationSettings.absenteeSmsEnabled}
                aria-label="Toggle absentee messages"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    automationSettings.absenteeSmsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {automationMessage && (
              <div className={`text-sm font-semibold ${automationStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {automationMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isAutomationBusy}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {automationStatus === 'saving' ? 'Saving...' : automationStatus === 'loading' ? 'Loading...' : 'Save Automation Settings'}
            </button>
          </form>
        </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Settings;
