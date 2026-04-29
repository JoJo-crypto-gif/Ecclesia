import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; role?: 'admin' | 'zone_leader'; error?: string }>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await onLogin(email, password);
    setIsSubmitting(false);
    if (result.success) {
      const target = result.role === 'zone_leader' ? '/zone-dashboard' : '/';
      navigate(target);
    } else {
      setError(result.error || 'Login failed');
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
           <p className="text-slate-500 mt-3 font-medium text-sm sm:text-base dark:text-slate-400">Welcome back, please sign in.</p>
        </div>

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
        </form>

        <div className="mt-8 text-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 dark:bg-slate-900/30 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 dark:text-slate-500">Need Access?</p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Contact your administrator for account credentials.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
