import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { CheckCircle2, User, ArrowRight, AlertCircle, Calendar } from 'lucide-react';
import { apiFetch } from '../utils/api';

const CheckIn: React.FC = () => {
  const { instanceId } = useParams();
  const { events, members, checkIn } = useData();

  const [userType, setUserType] = useState<'Member' | 'Visitor'>('Member');
  
  // Restore missing state variables
  const [identifier, setIdentifier] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [checkedInMember, setCheckedInMember] = useState<any>(null);
  const [instanceInfo, setInstanceInfo] = useState<any>(null);
  const [eventInfo, setEventInfo] = useState<any>(null);

  // Fetch instance info on mount
  useEffect(() => {
    if (!instanceId) return;
    
    apiFetch(`/api/events/instances/${instanceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setInstanceInfo(data.data);
          // Find matching event
          const event = events.find(e => e.id === data.data.eventId);
          setEventInfo(event || data.data);
        } else {
          setStatus('error');
          setMessage('Invalid Check-in Link');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not load event information');
      });
  }, [instanceId, events]);
  
  // Visitor Form State
  const [visitorForm, setVisitorForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    otherName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanceId) return;
    
    setStatus('loading');

    try {
      if (userType === 'Member') {
        // --- MEMBER FLOW ---
        // Backend handles lookup by Identifier (Phone/Email/ID)
        if (!identifier) return;
        const result = await checkIn(instanceId, undefined, identifier);
        
        if (result.success) {
          setStatus('success');
          if (result.member) {
            setCheckedInMember(result.member);
            setMessage(result.message || `Welcome, ${result.member.firstName}! You have been checked in.`);
          } else {
            // Should not happen for members really, but safe fallback
            setCheckedInMember(null);
            setMessage(result.message || `Welcome, ${identifier}! You have been checked in.`);
          }
        } else {
          setStatus('error');
          setMessage(result.message || 'Check-in failed. Please try again.');
        }

      } else {
        // --- VISITOR FLOW ---
        // 1. Register Visitor as a Member (Status: Visitor)
        // 2. Check them in
        const res = await apiFetch('/api/members/visitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instanceId,
                firstName: visitorForm.firstName,
                lastName: visitorForm.lastName,
                otherName: visitorForm.otherName,
                phone: visitorForm.phone,
                role: 'Member',
                status: 'Visitor',
                joinDate: new Date().toISOString()
            })
        });

        const data = await res.json();
        
        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to register details');
        }

        const newMember = data.data;

        // 3. Check In using the new Member ID
        const checkInRes = await checkIn(instanceId, newMember.id);
        
        if (checkInRes.success) {
            setStatus('success');
            setCheckedInMember(newMember);
            setMessage(`Welcome, ${newMember.firstName}! You are registered and checked in as a visitor.`);
        } else {
            setStatus('error');
            setMessage('Registration successful, but check-in failed. Please try scanning again.');
        }
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An error occurred. Please try again.');
    }
  };

  if (status === 'error' && !instanceInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Event Not Found</h1>
          <p className="text-slate-500 mt-2 dark:text-slate-400">This check-in link is invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50 p-6 animate-enter dark:bg-emerald-950/30">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border-4 border-emerald-100 relative dark:bg-slate-900 dark:border-emerald-900/50">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">You're Checked In!</h1>
          <p className="text-emerald-600 font-medium mb-6 dark:text-emerald-400">{message}</p>
          
          {checkedInMember && (
            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 text-left border border-slate-100 mb-8 dark:bg-slate-800 dark:border-slate-700">
              <img 
                src={checkedInMember.avatarUrl || `https://ui-avatars.com/api/?name=${checkedInMember.firstName}+${checkedInMember.lastName}&background=random`} 
                className="w-12 h-12 rounded-full object-cover" 
                alt="" 
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{checkedInMember.firstName} {checkedInMember.lastName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{checkedInMember.role || 'Member'} • {checkedInMember.status}</div>
              </div>
            </div>
          )}
          
          <p className="text-slate-400 text-sm mb-2 dark:text-slate-500">Enjoy the service!</p>
          <div className="text-xs text-slate-300 uppercase tracking-widest font-bold dark:text-slate-600">Ecclesia Manager</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-950 transition-colors duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-enter">
        <div className="text-center mb-6">
            {eventInfo && (
              <>
                <div className="inline-block bg-indigo-50 px-3 py-1 rounded-full text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                    {eventInfo.type}
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{eventInfo.name}</h1>
              </>
            )}
            {instanceInfo && (
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                <Calendar size={14} />
                <span>{new Date(instanceInfo.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            )}
            {!eventInfo && !instanceInfo && (
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Loading...</h1>
            )}
        </div>

        {/* User Type Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6 dark:bg-slate-800">
            <button 
                type="button"
                onClick={() => setUserType('Member')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${userType === 'Member' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
                I am a Member
            </button>
            <button 
                type="button"
                onClick={() => setUserType('Visitor')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${userType === 'Visitor' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
                I am a Visitor
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            
            {userType === 'Member' ? (
                <div>
                    <label className="block text-sm font-bold text-slate-700 ml-1 mb-2 dark:text-slate-300">Phone Number or Email</label>
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all font-medium text-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder="Type here..."
                            autoFocus
                            required
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 ml-1 mb-2 dark:text-slate-300">First Name</label>
                            <input 
                                type="text" 
                                value={visitorForm.firstName}
                                onChange={(e) => setVisitorForm({...visitorForm, firstName: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                placeholder="John"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 ml-1 mb-2 dark:text-slate-300">Last Name</label>
                            <input 
                                type="text" 
                                value={visitorForm.lastName}
                                onChange={(e) => setVisitorForm({...visitorForm, lastName: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                placeholder="Doe"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 ml-1 mb-2 dark:text-slate-300">Other Name <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <input 
                            type="text" 
                            value={visitorForm.otherName}
                            onChange={(e) => setVisitorForm({...visitorForm, otherName: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder=""
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 ml-1 mb-2 dark:text-slate-300">Phone Number</label>
                        <input 
                            type="tel" 
                            value={visitorForm.phone}
                            onChange={(e) => setVisitorForm({...visitorForm, phone: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder="055 555 5555"
                            required
                        />
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle size={16} />
                    {message}
                </div>
            )}

            <button 
                type="submit" 
                disabled={status === 'loading'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {status === 'loading' ? 'Checking in...' : <>Check In Now <ArrowRight size={18} /></>}
            </button>
        </form>
        
        <div className="mt-8 text-center hidden">
            <p className="text-xs text-slate-400 dark:text-slate-500">Not a member? Enter your name to check in as a visitor.</p>
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
