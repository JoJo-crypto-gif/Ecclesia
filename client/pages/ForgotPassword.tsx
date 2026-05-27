import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import Logo from '../components/Logo';
import { apiFetch } from '../utils/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setStatus('error');
        setMessage(data?.error?.message || 'Unable to request a reset right now.');
        return;
      }

      setStatus('sent');
      setMessage(data.message || 'If an account exists, we sent reset instructions.');
    } catch {
      setStatus('error');
      setMessage('Unable to request a reset right now.');
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight dark:text-white leading-none">Reset Password</h1>
          <p className="text-slate-500 mt-3 font-medium text-sm sm:text-base dark:text-slate-400">
            Enter your account email and check your inbox for a temporary password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="block text-sm font-bold text-slate-700 ml-1 dark:text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-5 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent focus:outline-none transition-all font-medium text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-600"
                placeholder="admin@church.com"
              />
            </div>
          </div>

          {message && (
            <div className={`text-sm font-semibold px-4 py-3 rounded-xl border ${
              status === 'error'
                ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
          >
            {status === 'submitting' ? 'Sending...' : 'Send Temporary Password'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft size={16} />
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
