import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, LogOut, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

const ChangeTemporaryPassword: React.FC = () => {
  const { user, authLoading, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) {
    return <Navigate to={user.role === 'zone_leader' ? '/zone-dashboard' : '/'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (newPassword.length < 8) {
      setStatus('error');
      setMessage('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('New passwords do not match.');
      return;
    }

    setStatus('saving');
    try {
      const res = await apiFetch('/api/auth/complete-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setStatus('error');
        setMessage(data?.error?.message || 'Failed to update password.');
        return;
      }

      setStatus('success');
      setMessage(data.message || 'Password updated. Please sign in with your new password.');
      setNewPassword('');
      setConfirmPassword('');
      logout();
      setTimeout(() => navigate('/login', { replace: true }), 1000);
    } catch {
      setStatus('error');
      setMessage('Failed to update password.');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-8 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 transition-all duration-500">
      <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 w-full max-w-md border border-white relative overflow-hidden animate-enter dark:bg-slate-800 dark:border-slate-700 dark:shadow-none">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />

        <div className="text-center mb-8 sm:mb-10 pt-2">
          <div className="inline-flex items-center justify-center mb-4 sm:mb-6 hover:scale-110 transition-transform duration-500 group">
            <Logo size="lg" className="shadow-2xl shadow-indigo-600/40 rounded-2xl sm:scale-110" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight dark:text-white leading-tight">Choose a New Password</h1>
          <p className="text-slate-500 mt-3 font-medium text-sm sm:text-base dark:text-slate-400">
            Your temporary password can only be used to set a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="block text-sm font-bold text-slate-700 ml-1 dark:text-slate-300">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-5 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent focus:outline-none transition-all font-medium text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-600"
                placeholder="At least 8 characters"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-bold text-slate-700 ml-1 dark:text-slate-300">Confirm New Password</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-5 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent focus:outline-none transition-all font-medium text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-600"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          {message && (
            <div className={`text-sm font-semibold px-4 py-3 rounded-xl border ${
              status === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40'
                : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'saving' || status === 'success'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
          >
            {status === 'saving' ? 'Updating...' : 'Update Password'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangeTemporaryPassword;
