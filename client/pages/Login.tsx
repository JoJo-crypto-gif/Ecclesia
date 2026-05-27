import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ 
    success: boolean; 
    role?: string;
    mustChangePassword?: boolean;
    error?: string; 
    mfaRequired?: boolean; 
    userId?: string;
    channel?: 'email' | 'sms';
    recipient?: string;
  }>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [mfaRequired, setMfaRequired] = useState(false);
  const [userId, setUserId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChannel, setMfaChannel] = useState<'email' | 'sms' | null>(null);
  const [mfaRecipient, setMfaRecipient] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await onLogin(email, password);
    setIsSubmitting(false);
    
    if (result.success) {
      if (result.mfaRequired) {
        setMfaRequired(true);
        setUserId(result.userId!);
        setMfaChannel(result.channel || 'email');
        setMfaRecipient(result.recipient || '');
      } else {
        const target = result.mustChangePassword ? '/change-password' : result.role === 'zone_leader' ? '/zone-dashboard' : '/';
        navigate(target);
      }
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: mfaCode }),
      });
      const data = await res.json();
      setIsSubmitting(false);
      
      if (res.ok && data.success) {
        login(data.data);
        const target = data.data.mustChangePassword ? '/change-password' : data.data.role === 'zone_leader' ? '/zone-dashboard' : '/';
        navigate(target);
      } else {
        setError(data.error?.message || 'Invalid code');
      }
    } catch {
      setIsSubmitting(false);
      setError('Verification failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-8 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 transition-all duration-500">
      <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 w-full max-w-md border border-white relative overflow-hidden animate-enter dark:bg-slate-800 dark:border-slate-700 dark:shadow-none">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        
        <div className="text-center mb-8 sm:mb-10 pt-2">
           <div className="inline-flex items-center justify-center mb-4 sm:mb-6 hover:scale-110 transition-transform duration-500 group">
              <Logo size="lg" className="shadow-2xl shadow-indigo-600/40 rounded-2xl sm:scale-110" />
           </div>
           <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight dark:text-white leading-none">Ecclesia Manager</h1>
           <p className="text-slate-500 mt-3 font-medium text-sm sm:text-base dark:text-slate-400">
             {mfaRequired 
               ? `Enter the security code sent to your ${mfaChannel === 'sms' ? 'phone number' : 'email'} (${mfaRecipient}).` 
               : 'Welcome back, please sign in.'}
           </p>
        </div>

        {!mfaRequired ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700 ml-1 dark:text-slate-300">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent focus:outline-none transition-all font-medium text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-600"
                placeholder="admin@church.com"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700 ml-1 dark:text-slate-300">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent focus:outline-none transition-all font-medium text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-600"
                placeholder="••••••••"
              />
            </div>
            
            {error && (
              <div className="bg-rose-50 text-rose-600 border border-rose-100 text-sm font-semibold px-4 py-3 rounded-xl dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 mt-2 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
            >
              {isSubmitting ? 'Signing In…' : 'Sign In to Dashboard'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="w-full text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="space-y-6 animate-enter">
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700 ml-1 dark:text-slate-300">Security Code</label>
              <input 
                type="text" 
                required
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-5 py-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent focus:outline-none transition-all font-mono text-center text-2xl tracking-[0.5em] text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-600"
                placeholder="000000"
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 border border-rose-100 text-sm font-semibold px-4 py-3 rounded-xl dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting || mfaCode.length !== 6}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 mt-2 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none"
            >
              {isSubmitting ? 'Verifying…' : 'Verify Code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMfaRequired(false);
                setMfaCode('');
                setError('');
                setMfaChannel(null);
                setMfaRecipient('');
              }}
              className="w-full text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:text-slate-200 mt-4"
            >
              Back to Login
            </button>
          </form>
        )}

        <div className="mt-8 text-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 dark:bg-slate-900/30 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 dark:text-slate-500">Need Access?</p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Contact your administrator for account credentials.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
