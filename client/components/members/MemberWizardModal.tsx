import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Aperture, User, Upload, Camera, Mail, Phone, MapPin, 
  AlertCircle, Briefcase, Calendar, ArrowLeft, ArrowRight, CheckCircle2, Megaphone 
} from 'lucide-react';
import Modal from '../Modal';
import { Member, MemberStatus, Zone } from '../../types';

interface MemberWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMember: Member | null;
  onSave: (data: Partial<Member>) => void;
  zones: Zone[];
  isZoneLocked?: boolean;
  lockedZoneId?: string;
  lockedZoneName?: string;
}

const MemberWizardModal: React.FC<MemberWizardModalProps> = ({ 
  isOpen, onClose, editingMember, onSave, zones, isZoneLocked = false, lockedZoneId, lockedZoneName
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [formData, setFormData] = useState<Partial<Member>>({});
  
  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      const nextFormData: Partial<Member> = editingMember
        ? { ...editingMember }
        : {
            status: MemberStatus.Active,
            joinDate: new Date().toISOString().split('T')[0],
            role: 'Member'
          };

      if (isZoneLocked && lockedZoneId) {
        nextFormData.zoneId = lockedZoneId;
      }

      setFormData(nextFormData);
      setCurrentStep(1);
      setIsCameraOpen(false);
    } else {
      stopCamera();
    }
  }, [isOpen, editingMember, isZoneLocked, lockedZoneId]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
        videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  const startCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        setCameraStream(stream);
        setIsCameraOpen(true);
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Unable to access camera. Please ensure you have granted camera permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setFormData(prev => ({ ...prev, avatarUrl: dataUrl }));
            stopCamera();
        }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName) {
        alert("Please enter first and last name.");
        return;
      }
    }
    setDirection('right');
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setDirection('left');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = () => {
    if (formData.firstName && formData.lastName) {
      const normalizedMaritalStatus = formData.maritalStatus || null;
      const normalizedMarriageDate = normalizedMaritalStatus === 'Married'
        ? (formData.marriageDate || null)
        : null;

      const normalizedPayload = {
        ...formData,
        maritalStatus: normalizedMaritalStatus,
        marriageDate: normalizedMarriageDate
      };

      const payload = isZoneLocked && lockedZoneId
        ? { ...normalizedPayload, zoneId: lockedZoneId }
        : normalizedPayload;
      onSave(payload);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              currentStep >= step 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-110 dark:bg-indigo-500' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div className={`w-12 h-1 rounded-full mx-2 transition-all duration-300 ${
              currentStep > step ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-100 dark:bg-slate-800'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={editingMember ? "Edit Member Profile" : "New Member Registration"}
        maxWidth="max-w-xl"
      >
        <div className="p-6">
            {renderStepIndicator()}
            
            <div className="min-h-[340px] overflow-hidden relative">
                {/* STEP 1: PERSONAL INFO */}
                {currentStep === 1 && (
                    <div className={`space-y-6 ${direction === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
                        <div className="text-center mb-6">
                             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Personal Information</h3>
                             <p className="text-slate-500 text-sm dark:text-slate-400">Basic details to identify the member</p>
                        </div>

                        {/* Profile Picture / Camera Section */}
                        <div className="flex flex-col items-center justify-center mb-6 gap-4">
                            <div className="relative">
                                {isCameraOpen ? (
                                    <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-indigo-100 relative bg-black dark:border-indigo-900">
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                                             <button onClick={stopCamera} className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors">
                                                <X size={16} />
                                             </button>
                                             <button onClick={capturePhoto} className="p-1.5 bg-white/90 text-indigo-600 rounded-full hover:bg-white transition-colors">
                                                <Aperture size={20} />
                                             </button>
                                        </div>
                                        <canvas ref={canvasRef} className="hidden" />
                                    </div>
                                ) : (
                                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 flex items-center justify-center shadow-inner relative dark:bg-slate-800 dark:border-slate-700">
                                        {formData.avatarUrl ? (
                                            <img src={formData.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                                        ) : (
                                            <User size={48} className="text-slate-300 dark:text-slate-600" />
                                        )}
                                        {/* Hidden File Input */}
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                    </div>
                                )}
                            </div>

                            {!isCameraOpen && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                    >
                                        <Upload size={14} /> Upload
                                    </button>
                                    <button 
                                        onClick={startCamera}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                                    >
                                        <Camera size={14} /> Camera
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">First Name</label>
                                <input 
                                    type="text" 
                                    value={formData.firstName || ''} 
                                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                    placeholder="Jane"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Last Name</label>
                                <input 
                                    type="text" 
                                    value={formData.lastName || ''} 
                                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Date of Birth</label>
                                <input 
                                type="date" 
                                value={formData.dob || ''} 
                                onChange={e => setFormData({...formData, dob: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Gender</label>
                                <select 
                                    value={formData.gender || 'Male'}
                                    onChange={e => setFormData({...formData, gender: e.target.value as any})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: CONTACT DETAILS */}
                {currentStep === 2 && (
                    <div className={`space-y-6 ${direction === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
                        <div className="text-center mb-6">
                             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Contact Details</h3>
                             <p className="text-slate-500 text-sm dark:text-slate-400">How can we reach this member?</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    <input 
                                        type="email" 
                                        value={formData.email || ''} 
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                        placeholder="jane.doe@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={formData.phone || ''} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                        placeholder="(555) 000-0000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Residential Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    <textarea 
                                        value={formData.address || ''} 
                                        onChange={e => setFormData({...formData, address: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all h-24 resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                        placeholder="Full address here..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-bold text-slate-900 mb-3 dark:text-white flex items-center gap-2">
                                    <AlertCircle size={16} className="text-rose-500" /> 
                                    Emergency Contact
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Contact Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.emergencyContact || ''} 
                                            onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                            placeholder="Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Contact Phone</label>
                                        <input 
                                            type="text" 
                                            value={formData.emergencyPhone || ''} 
                                            onChange={e => setFormData({...formData, emergencyPhone: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                            placeholder="Phone"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: MINISTRY INFO */}
                {currentStep === 3 && (
                    <div className={`space-y-6 ${direction === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
                        <div className="text-center mb-6">
                             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Church Involvement</h3>
                             <p className="text-slate-500 text-sm dark:text-slate-400">Role, Zone, and Status</p>
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">
                                  {isZoneLocked ? 'Assigned Zone' : 'Assign Zone'}
                                </label>
                                {isZoneLocked ? (
                                  <div className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-medium dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300">
                                    {lockedZoneName || 'Your Zone'}
                                  </div>
                                ) : (
                                  <select 
                                  value={formData.zoneId || ''}
                                  onChange={e => setFormData({...formData, zoneId: e.target.value})}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  >
                                  <option value="">-- Select --</option>
                                  {zones.map(z => (
                                      <option key={z.id} value={z.id}>{z.name}</option>
                                  ))}
                                  </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Current Status</label>
                                <select 
                                    value={formData.status || MemberStatus.Active}
                                    onChange={e => setFormData({...formData, status: e.target.value as MemberStatus})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                >
                                    <option value={MemberStatus.Active}>Active</option>
                                    <option value={MemberStatus.Inactive}>Inactive</option>
                                    <option value={MemberStatus.Visitor}>Visitor</option>
                                </select>
                            </div>
                        </div>

                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Role / Ministry</label>
                           <div className="relative">
                                <Briefcase className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    value={formData.role || ''} 
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                    placeholder="e.g. Choir, Usher, Member"
                                />
                           </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Date Joined</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input 
                                    type="date" 
                                    value={formData.joinDate || ''} 
                                    onChange={e => setFormData({...formData, joinDate: e.target.value})}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">How did you hear about us? (Optional)</label>
                            <div className="relative">
                                <Megaphone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <select 
                                    value={formData.discoverySource || ''}
                                    onChange={e => setFormData({...formData, discoverySource: e.target.value})}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white appearance-none"
                                >
                                    <option value="">-- Select Source --</option>
                                    <option value="Social Media">Social Media</option>
                                    <option value="Friend/Family Invitation">Friend / Family Invitation</option>
                                    <option value="Evangelism Outreach">Evangelism Outreach</option>
                                    <option value="Church Website">Church Website</option>
                                    <option value="Walk-In">Walk-In</option>
                                    <option value="Other">Other</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Marital Status</label>
                           <select
                               value={formData.maritalStatus || ''}
                               onChange={e => {
                                   const maritalStatus = e.target.value;
                                   setFormData({
                                       ...formData,
                                       maritalStatus: maritalStatus as any,
                                       marriageDate: maritalStatus === 'Married' ? (formData.marriageDate || '') : null
                                   });
                               }}
                               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                           >
                               <option value="">-- Select Status --</option>
                               <option value="Single">Single</option>
                               <option value="Married">Married</option>
                               <option value="Divorced">Divorced</option>
                               <option value="Widowed">Widowed</option>
                               <option value="Separated">Separated</option>
                           </select>
                        </div>

                        {formData.maritalStatus === 'Married' && (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Date of Marriage</label>
                              <input
                                  type="date"
                                  value={formData.marriageDate || ''}
                                  onChange={e => setFormData({ ...formData, marriageDate: e.target.value })}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              />
                          </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Occupation</label>
                            <input 
                                type="text" 
                                value={formData.occupation || ''} 
                                onChange={e => setFormData({...formData, occupation: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                placeholder="e.g. Teacher, Engineer, Student"
                            />
                        </div>

                        <div className="col-span-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Additional Notes</label>
                             <textarea 
                                 value={formData.notes || ''} 
                                 onChange={e => setFormData({...formData, notes: e.target.value})}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all h-20 resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                 placeholder="Anything else we should know?"
                             />
                        </div>
                    </div>
                )}
            </div>

            {/* Wizard Footer Navigation */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                {currentStep > 1 ? (
                    <button 
                        onClick={handlePrevStep}
                        className="flex items-center gap-2 px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft size={18} /> Back
                    </button>
                ) : (
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-500 hover:text-slate-700 font-bold transition-colors dark:text-slate-500 dark:hover:text-slate-300"
                    >
                        Cancel
                    </button>
                )}

                {currentStep < 3 ? (
                    <button 
                        onClick={handleNextStep}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:shadow-indigo-600/30"
                    >
                        Next <ArrowRight size={18} />
                    </button>
                ) : (
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                    >
                        {editingMember ? "Save Changes" : "Complete Registration"} <CheckCircle2 size={18} />
                    </button>
                )}
            </div>
        </div>
    </Modal>
  );
};

export default MemberWizardModal;
