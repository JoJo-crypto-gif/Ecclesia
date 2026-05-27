import React, { useState, useEffect, useRef } from 'react';
import {
    X, Aperture, User, Upload, Camera, Mail, Phone, MapPin,
    AlertCircle, Briefcase, Calendar, ArrowLeft, ArrowRight, CheckCircle2, Megaphone, Plus, Trash2, ChevronUp, ChevronDown
} from 'lucide-react';
import Modal from '../Modal';
import CustomSelect from '../CustomSelect';
import { useToast } from '../../context/ToastContext';
import { Member, MemberChild, MemberStatus, Zone } from '../../types';
import { parseOccupation, serializeOccupation, EmploymentDetails } from '../../utils/occupation';

const EMPLOYMENT_STATUS_OPTIONS = [
    { value: 'Employed', label: 'Employed' },
    { value: 'Self-Employed', label: 'Self-Employed' },
    { value: 'Student', label: 'Student' },
    { value: 'Retired', label: 'Retired / Pensioner' },
    { value: 'Unemployed', label: 'Unemployed' },
];

const EDUCATION_OPTIONS = [
    { value: 'Basic', label: 'Basic' },
    { value: 'JHS', label: 'JHS (Junior High School)' },
    { value: 'MSLC', label: 'MSLC' },
    { value: 'SHS', label: 'SHS (Senior High School)' },
    { value: 'Degree', label: 'Degree' },
    { value: '2nd Degree', label: '2nd Degree' },
    { value: 'Masters (MSc)', label: 'Masters (MSc)' },
    { value: 'Master (MBA)', label: 'Master (MBA)' },
    { value: 'PhD', label: 'PhD' },
    { value: 'Other', label: 'Other (Specify below)' },
];

const isStandardEducation = (val?: string) => {
    return val ? ['Basic', 'JHS', 'MSLC', 'SHS', 'Degree', '2nd Degree', 'Masters (MSc)', 'Master (MBA)', 'PhD'].includes(val) : false;
};


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

const TITLE_OPTIONS = ['Mr.', 'Mrs.', 'Miss', 'Ms.', 'Mister', 'Dr.', 'Rev.', 'Prof.', 'Hon.', 'Pastor', 'Bishop'];

const GENDER_OPTIONS = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
];

const MARITAL_STATUS_OPTIONS = [
    { value: '', label: '-- Select Status --' },
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' },
    { value: 'Separated', label: 'Separated' },
];

const STATUS_OPTIONS = [
    { value: MemberStatus.Active, label: 'Active' },
    { value: MemberStatus.Inactive, label: 'Inactive' },
    { value: MemberStatus.Visitor, label: 'Visitor' },
    { value: MemberStatus.ExMember, label: 'Ex-member' },
];

const EX_MEMBER_REASON_OPTIONS = [
    { value: '', label: '-- Select Reason --' },
    { value: 'Transferred', label: 'Transferred' },
    { value: 'Married off', label: 'Married off' },
    { value: 'Deceased', label: 'Deceased' },
    { value: 'Resigned', label: 'Resigned' },
    { value: 'Disciplinary Action', label: 'Disciplinary Action' },
    { value: 'Other', label: 'Other' },
];

const ROLE_OPTIONS = [
    { value: '', label: '-- Select Role --' },
    { value: 'Member', label: 'Member' },
    { value: 'Usher', label: 'Usher' },
    { value: 'Choir', label: 'Choir' },
    { value: 'Media', label: 'Media' },
    { value: 'Sunday School', label: 'Sunday School' },
    { value: 'Deacon', label: 'Deacon' },
    { value: 'Elder', label: 'Elder' },
    { value: 'Pastor', label: 'Pastor' },
    { value: 'Other', label: 'Other' },
];

const DISCOVERY_SOURCE_OPTIONS = [
    { value: '', label: '-- Select Source --' },
    { value: 'Social Media', label: 'Social Media' },
    { value: 'Friend/Family Invitation', label: 'Friend / Family Invitation' },
    { value: 'Evangelism Outreach', label: 'Evangelism Outreach' },
    { value: 'Church Website', label: 'Church Website' },
    { value: 'Walk-In', label: 'Walk-In' },
    { value: 'Other', label: 'Other' },
];



const MemberWizardModal: React.FC<MemberWizardModalProps> = ({
    isOpen, onClose, editingMember, onSave, zones, isZoneLocked = false, lockedZoneId, lockedZoneName
}) => {
    const { error: toastError } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const [formData, setFormData] = useState<Partial<Member>>({});

    const zoneOptions = React.useMemo(() => [
        { value: '', label: '-- Select --' },
        ...zones.map(z => ({ value: z.id, label: z.name }))
    ], [zones]);

    const interestOptions = React.useMemo(() => {
        const baseOptions = [
            { value: 'Evangelism', label: 'Evangelism' },
            { value: 'Edification', label: 'Edification' },
            { value: 'Baptism', label: 'Baptism' }
        ];

        // If current value is set and not in base options, include it as an option
        if (formData.interest && !baseOptions.some(opt => opt.value === formData.interest)) {
            baseOptions.push({ value: formData.interest, label: formData.interest });
        }
        return [
            { value: '', label: '-- Select Interest --' },
            ...baseOptions
        ];
    }, [formData.interest]);

    const occupationDetails = React.useMemo(() => {
        return parseOccupation(formData.occupation);
    }, [formData.occupation]);

    const handleOccupationChange = (updatedFields: Partial<EmploymentDetails>) => {
        const currentDetails = parseOccupation(formData.occupation);
        const nextDetails = { ...currentDetails, ...updatedFields };
        // If changing status, reset conditional fields
        if (updatedFields.status) {
            nextDetails.role = '';
            nextDetails.organization = '';
            nextDetails.location = '';
        }
        setFormData(prev => ({
            ...prev,
            occupation: serializeOccupation(nextDetails)
        }));
    };

    // Camera state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (isOpen) {
            const nextFormData: Partial<Member> = editingMember
                ? {
                    ...editingMember,
                    gender: editingMember.gender || 'Male',
                    discoverySource: editingMember.discoverySource || '',
                }
                : {
                    status: MemberStatus.Active,
                    joinDate: new Date().toISOString().split('T')[0],
                    role: 'Member',
                    gender: 'Male',
                    discoverySource: '',
                };

            if (isZoneLocked && lockedZoneId) {
                nextFormData.zoneId = lockedZoneId;
            }

            nextFormData.titles = Array.isArray(nextFormData.titles) ? nextFormData.titles : [];

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
            toastError("Unable to access camera. Please ensure you have granted camera permissions.");
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

    const [errors, setErrors] = useState<string[]>([]);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePhone = (phone: string) => /^\d{10}$/.test(phone.replace(/\D/g, ''));

    const validateCurrentStep = (): boolean => {
        const newErrors: string[] = [];
        if (currentStep === 1) {
            if (!formData.firstName || !formData.lastName) newErrors.push('First and last name are required.');
            if (formData.email && !validateEmail(formData.email)) newErrors.push('Invalid email address.');
            if (formData.phone && !validatePhone(formData.phone)) newErrors.push('Phone number must be exactly 10 digits.');
        } else if (currentStep === 2) {
            if (!formData.address) newErrors.push('Residential address is required.');
            if (!formData.emergencyContact) newErrors.push('Emergency contact name is required.');
            if (!formData.emergencyPhone || !validatePhone(formData.emergencyPhone)) newErrors.push('Emergency contact phone must be exactly 10 digits.');
            if (formData.whatsapp && !validatePhone(formData.whatsapp)) newErrors.push('Other number (WhatsApp) must be exactly 10 digits.');
        } else if (currentStep === 3) {
            if (!formData.maritalStatus) newErrors.push('Marital status is required.');
            if (!formData.motherName || !formData.fatherName) newErrors.push('Mother and father names are required.');
            if (formData.maritalStatus === 'Married') {
                if (!formData.spouseName) newErrors.push('Spouse name is required when married.');
                if (!formData.spousePhone || !validatePhone(formData.spousePhone)) newErrors.push('Spouse phone must be exactly 10 digits.');
            }
            if (formData.children && formData.children.length > 0) {
                formData.children.forEach((child, i) => {
                    if (!child.name) newErrors.push(`Child ${i + 1} name is required.`);
                    if (!child.dob) newErrors.push(`Child ${i + 1} Date of Birth is required.`);
                    if (child.phone && !validatePhone(child.phone)) newErrors.push(`Child ${i + 1} phone must be exactly 10 digits.`);
                });
            }
        } else if (currentStep === 4) {
            if (!formData.status) newErrors.push('Member status is required.');
            if (!formData.interest) {
                newErrors.push('Ministry / Role Interest (Church Involvement) is required.');
            }
            if (formData.status === MemberStatus.ExMember && !formData.exMemberReason) {
                newErrors.push('Please specify a reason for the member leaving.');
            }
        }
        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleNextStep = () => {
        if (!validateCurrentStep()) return;
        setErrors([]);
        setDirection('right');
        setCurrentStep(prev => Math.min(prev + 1, 5));
    };

    const handlePrevStep = () => {
        setErrors([]);
        setDirection('left');
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSave = () => {
        if (!validateCurrentStep()) return;

        if (formData.firstName && formData.lastName) {
            const normalizedTitles = (formData.titles || []).reduce<string[]>((acc, title) => {
                const trimmed = title.trim();
                if (!trimmed || acc.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
                    return acc;
                }
                acc.push(trimmed);
                return acc;
            }, []);

            // Normalize Marital Status
            const normalizedMaritalStatus = formData.maritalStatus || null;
            const isMarried = normalizedMaritalStatus === 'Married';

            // Normalize Baptism
            const isBaptized = formData.isBaptized === true;

            const normalizedPayload = {
                ...formData,
                otherName: formData.otherName?.trim() || null,
                titles: normalizedTitles,
                maritalStatus: normalizedMaritalStatus,
                marriageDate: isMarried ? (formData.marriageDate || null) : null,
                spouseName: isMarried ? (formData.spouseName || null) : null,
                spousePhone: isMarried ? (formData.spousePhone || null) : null,
                spouseChurch: isMarried ? (formData.spouseChurch || null) : null,
                landmark: formData.landmark || null,
                whatsapp: formData.whatsapp || null,
                homeTown: formData.homeTown || null,

                isBaptized,
                baptismDate: isBaptized ? (formData.baptismDate || null) : null,
                baptizedBy: isBaptized ? (formData.baptizedBy || null) : null,
                baptismChurch: isBaptized ? (formData.baptismChurch || null) : null,
                brothersKeeper: isBaptized ? (formData.brothersKeeper || null) : null,
                education: formData.education?.trim() || null,
                interest: formData.interest?.trim() || null,
            };

            const payload = isZoneLocked && lockedZoneId
                ? { ...normalizedPayload, zoneId: lockedZoneId }
                : normalizedPayload;
            onSave(payload);
        }
    };

    const addTitle = (rawTitle: string) => {
        const title = rawTitle.trim();
        if (!title) return;

        setFormData((prev) => {
            const currentTitles = Array.isArray(prev.titles) ? prev.titles : [];
            if (currentTitles.some((item) => item.toLowerCase() === title.toLowerCase())) {
                return prev;
            }

            return {
                ...prev,
                titles: [...currentTitles, title],
            };
        });
    };

    const removeTitle = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            titles: (prev.titles || []).filter((_, currentIndex) => currentIndex !== index),
        }));
    };

    const moveTitle = (index: number, directionStep: -1 | 1) => {
        setFormData((prev) => {
            const currentTitles = [...(prev.titles || [])];
            const nextIndex = index + directionStep;

            if (nextIndex < 0 || nextIndex >= currentTitles.length) {
                return prev;
            }

            [currentTitles[index], currentTitles[nextIndex]] = [currentTitles[nextIndex], currentTitles[index]];
            return {
                ...prev,
                titles: currentTitles,
            };
        });
    };

    const renderStepIndicator = () => {
        const STEP_LABELS = ['Identity', 'Contact', 'Family', 'Church', 'Profile'];
        return (
            <div className="flex items-center justify-center mb-8 gap-1">
                {[1, 2, 3, 4, 5].map((step) => (
                    <div key={step} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep > step ? 'bg-indigo-600 text-white dark:bg-indigo-500' :
                                    currentStep === step ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-110 dark:bg-indigo-500' :
                                        'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                 }`}>
                                {currentStep > step ? <CheckCircle2 size={14} /> : step}
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${currentStep === step ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}>
                                {STEP_LABELS[step - 1]}
                            </span>
                        </div>
                        {step < 5 && (
                            <div className={`w-8 h-0.5 rounded-full mx-1 mb-4 transition-all duration-300 ${currentStep > step ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-100 dark:bg-slate-800'
                                }`} />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingMember ? "Edit Member Profile" : "New Member Registration"}
            maxWidth="max-w-xl"
        >
            <div className="p-6">
                {renderStepIndicator()}

                {errors.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20">
                        <div className="flex items-start gap-3">
                            <div className="p-1 bg-rose-100 rounded-lg text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                                <AlertCircle size={16} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-1">Please fix the following errors:</h4>
                                <ul className="list-disc list-inside text-xs text-rose-600 dark:text-rose-400 space-y-0.5">
                                    {errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                <div className="min-h-[340px] overflow-visible relative">
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

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4 dark:border-slate-700 dark:bg-slate-800/60">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Titles</h4>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Optional. Titles appear on the ID card in the order shown here.</p>
                                </div>

                                {(formData.titles || []).length > 0 ? (
                                    <div className="space-y-2">
                                        {(formData.titles || []).map((title, index) => (
                                            <div key={`${title}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                                        {index + 1}
                                                    </span>
                                                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveTitle(index, -1)}
                                                        disabled={index === 0}
                                                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                                                        title="Move up"
                                                    >
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveTitle(index, 1)}
                                                        disabled={index === (formData.titles || []).length - 1}
                                                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                                                        title="Move down"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTitle(index)}
                                                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                                                        title="Remove title"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                                        No titles added yet
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {TITLE_OPTIONS.map((title) => {
                                        const isSelected = (formData.titles || []).some((item) => item.toLowerCase() === title.toLowerCase());
                                        return (
                                            <button
                                                key={title}
                                                type="button"
                                                onClick={() => addTitle(title)}
                                                disabled={isSelected}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${isSelected
                                                        ? 'cursor-not-allowed border-indigo-200 bg-indigo-50 text-indigo-500 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300'
                                                    }`}
                                            >
                                                {title}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">First Name <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.firstName || ''}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                        placeholder="Jane"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Other Name</label>
                                    <input
                                        type="text"
                                        value={formData.otherName || ''}
                                        onChange={e => setFormData({ ...formData, otherName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                        placeholder="Middle or additional name"
                                    />
                                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Saved on the profile, hidden on the ID card.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Last Name <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.lastName || ''}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
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
                                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                        className="w-full h-[50px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Gender</label>
                                    <CustomSelect
                                        value={formData.gender || 'Male'}
                                        onChange={val => setFormData({ ...formData, gender: val as any })}
                                        options={GENDER_OPTIONS}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Hometown <span className="text-slate-400 font-normal normal-case text-[11px]">(optional)</span></label>
                                <input
                                    type="text"
                                    value={formData.homeTown || ''}
                                    onChange={e => setFormData({ ...formData, homeTown: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                    placeholder="e.g. Kumasi, Sunyani, Tamale"
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CONTACT */}
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
                                            onChange={e => {
                                                setFormData({ ...formData, email: e.target.value });
                                                setTouched({ ...touched, email: true });
                                            }}
                                            onBlur={() => setTouched({ ...touched, email: true })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                            placeholder="jane.doe@example.com"
                                        />
                                        {touched.email && formData.email && !validateEmail(formData.email) && (
                                            <span className="text-[10px] text-rose-500 absolute -bottom-4 left-4">Invalid email address</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Phone Number <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="tel"
                                            maxLength={10}
                                            value={formData.phone || ''}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, phone: val });
                                                setTouched({ ...touched, phone: true });
                                            }}
                                            onBlur={() => setTouched({ ...touched, phone: true })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                            placeholder="10 digits"
                                        />
                                        {touched.phone && formData.phone && formData.phone.length > 0 && formData.phone.length < 10 && (
                                            <span className="text-[10px] text-rose-500 absolute -bottom-4 left-4">Must be exactly 10 digits</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Other Number (WhatsApp) <span className="font-normal lowercase opacity-70">(opt)</span></label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="tel"
                                            maxLength={10}
                                            value={formData.whatsapp || ''}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, whatsapp: val });
                                                setTouched({ ...touched, whatsapp: true });
                                            }}
                                            onBlur={() => setTouched({ ...touched, whatsapp: true })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                            placeholder="Optional 10 digits"
                                        />
                                        {touched.whatsapp && formData.whatsapp && formData.whatsapp.length > 0 && formData.whatsapp.length < 10 && (
                                            <span className="text-[10px] text-rose-500 absolute -bottom-4 left-4">Must be exactly 10 digits</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Residential Address <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <textarea
                                            value={formData.address || ''}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all h-24 resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                            placeholder="Full address here..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Landmark / Direction</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={formData.landmark || ''}
                                            onChange={e => setFormData({ ...formData, landmark: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                            placeholder="e.g. Near City Mall, opposite Green Park"
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
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Contact Name <span className="text-rose-500">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.emergencyContact || ''}
                                                onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                                placeholder="Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Contact Phone <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    maxLength={10}
                                                    value={formData.emergencyPhone || ''}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setFormData({ ...formData, emergencyPhone: val });
                                                        setTouched({ ...touched, emergencyPhone: true });
                                                    }}
                                                    onBlur={() => setTouched({ ...touched, emergencyPhone: true })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500/40"
                                                    placeholder="10 digits"
                                                />
                                                {touched.emergencyPhone && formData.emergencyPhone && formData.emergencyPhone.length > 0 && formData.emergencyPhone.length < 10 && (
                                                    <span className="text-[10px] text-rose-500 absolute -bottom-4 left-2">Must be exactly 10 digits</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: FAMILY */}
                    {currentStep === 3 && (
                        <div className={`space-y-6 ${direction === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Family Details</h3>
                                <p className="text-slate-500 text-sm dark:text-slate-400">Marital status, parents &amp; children</p>
                            </div>

                            {/* Marital Status */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Marital Status <span className="text-rose-500">*</span></label>
                                <CustomSelect
                                    value={formData.maritalStatus || ''}
                                    onChange={maritalStatus => {
                                        setFormData({
                                            ...formData,
                                            maritalStatus: maritalStatus as any,
                                            marriageDate: maritalStatus === 'Married' ? (formData.marriageDate || '') : null,
                                            spouseName: maritalStatus === 'Married' ? (formData.spouseName || '') : null,
                                            spousePhone: maritalStatus === 'Married' ? (formData.spousePhone || '') : null,
                                            spouseChurch: maritalStatus === 'Married' ? (formData.spouseChurch || '') : null
                                        });
                                    }}
                                    options={MARITAL_STATUS_OPTIONS}
                                    placeholder="-- Select Status --"
                                />
                            </div>

                            {formData.maritalStatus === 'Married' && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl dark:bg-slate-800/60 dark:border-slate-700 space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-slate-400">Marriage Details</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Date of Marriage</label>
                                        <input
                                            type="date"
                                            value={formData.marriageDate || ''}
                                            onChange={e => setFormData({ ...formData, marriageDate: e.target.value })}
                                            className="w-full h-[50px] px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white text-slate-600"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Spouse's Name <span className="text-rose-500">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.spouseName || ''}
                                                onChange={e => setFormData({ ...formData, spouseName: e.target.value })}
                                                placeholder="Full Name"
                                                className="w-full h-[50px] px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Spouse's Contact <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    maxLength={10}
                                                    value={formData.spousePhone || ''}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setFormData({ ...formData, spousePhone: val });
                                                        setTouched({ ...touched, spousePhone: true });
                                                    }}
                                                    onBlur={() => setTouched({ ...touched, spousePhone: true })}
                                                    placeholder="10 digits"
                                                    className="w-full h-[50px] px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                                />
                                                {touched.spousePhone && formData.spousePhone && formData.spousePhone.length > 0 && formData.spousePhone.length < 10 && (
                                                    <span className="text-[10px] text-rose-500 absolute -bottom-4 left-2">Must be exactly 10 digits</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Spouse's Church</label>
                                        <input
                                            type="text"
                                            value={formData.spouseChurch || ''}
                                            onChange={e => setFormData({ ...formData, spouseChurch: e.target.value })}
                                            placeholder="Spouse's Church (optional)"
                                            className="w-full h-[50px] px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Parent Details */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 dark:text-slate-400">Family Details</h4>
                                <div className="grid grid-cols-2 gap-3">

                                    {/* Mother Card */}
                                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
                                                <span className="text-xs">👩</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider dark:text-slate-400">Mother <span className="text-rose-500">*</span></span>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.motherName || ''}
                                            onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:text-white placeholder:text-slate-400"
                                            placeholder="Full name"
                                        />
                                        <div className="flex gap-1.5">
                                            {(['Alive', 'Deceased', 'Unknown'] as const).map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, motherStatus: formData.motherStatus === s ? null : s })}
                                                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all duration-150 ${formData.motherStatus === s
                                                            ? s === 'Alive' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                                                                : s === 'Deceased' ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/30'
                                                                    : 'bg-slate-500 text-white border-slate-500 shadow-sm'
                                                            : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Father Card */}
                                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                                <span className="text-xs">👨</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider dark:text-slate-400">Father <span className="text-rose-500">*</span></span>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.fatherName || ''}
                                            onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:text-white placeholder:text-slate-400"
                                            placeholder="Full name"
                                        />
                                        <div className="flex gap-1.5">
                                            {(['Alive', 'Deceased', 'Unknown'] as const).map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, fatherStatus: formData.fatherStatus === s ? null : s })}
                                                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all duration-150 ${formData.fatherStatus === s
                                                            ? s === 'Alive' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                                                                : s === 'Deceased' ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/30'
                                                                    : 'bg-slate-500 text-white border-slate-500 shadow-sm'
                                                            : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Children Section */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400 flex items-center gap-2">
                                        👶 Children {(formData.children?.length || 0) > 0 && (
                                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-indigo-500/20 dark:text-indigo-400">
                                                {formData.children?.length}
                                            </span>
                                        )}
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            children: [...(formData.children || []), { name: '', phone: '', dob: '' }]
                                        })}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-all border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 dark:hover:bg-indigo-500/20"
                                    >
                                        <Plus size={14} /> Add Child
                                    </button>
                                </div>

                                {(!formData.children || formData.children.length === 0) && (
                                    <div className="text-center py-6 text-slate-400 text-sm dark:text-slate-500">
                                        No children added yet
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {(formData.children || []).map((child: MemberChild, index: number) => (
                                        <div key={index} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                                                    <span className="text-sm">👶</span>
                                                </div>
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-slate-400">Name <span className="text-rose-500">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={child.name || ''}
                                                            onChange={e => {
                                                                const updated = [...(formData.children || [])];
                                                                updated[index] = { ...updated[index], name: e.target.value };
                                                                setFormData({ ...formData, children: updated });
                                                            }}
                                                            placeholder="Name"
                                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:text-white placeholder:text-slate-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-slate-400">Date of Birth <span className="text-rose-500">*</span></label>
                                                        <input
                                                            type="date"
                                                            value={child.dob || ''}
                                                            onChange={e => {
                                                                const updated = [...(formData.children || [])];
                                                                updated[index] = { ...updated[index], dob: e.target.value };
                                                                setFormData({ ...formData, children: updated });
                                                            }}
                                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 dark:text-slate-400">Phone <span className="font-normal lowercase opacity-70">(opt)</span></label>
                                                        <div className="relative">
                                                            <input
                                                                type="tel"
                                                                maxLength={10}
                                                                value={child.phone || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                                    const updated = [...(formData.children || [])];
                                                                    updated[index] = { ...updated[index], phone: val };
                                                                    setFormData({ ...formData, children: updated });
                                                                    setTouched({ ...touched, [`child_${index}`]: true });
                                                                }}
                                                                onBlur={() => setTouched({ ...touched, [`child_${index}`]: true })}
                                                                placeholder="10 digits"
                                                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:text-white placeholder:text-slate-400"
                                                            />
                                                            {touched[`child_${index}`] && child.phone && child.phone.length > 0 && child.phone.length < 10 && (
                                                                <span className="text-[10px] text-rose-500 absolute -bottom-4 left-1">Must be 10 digits</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = (formData.children || []).filter((_: MemberChild, i: number) => i !== index);
                                                        setFormData({ ...formData, children: updated });
                                                    }}
                                                    className="mt-1 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all dark:hover:bg-rose-500/10"
                                                    title="Remove child"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CHURCH */}
                    {currentStep === 4 && (
                        <div className={`space-y-6 ${direction === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Church Involvement</h3>
                                <p className="text-slate-500 text-sm dark:text-slate-400">Zone, role and membership status</p>
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
                                        <CustomSelect
                                            value={formData.zoneId || ''}
                                            onChange={val => setFormData({ ...formData, zoneId: val })}
                                            options={zoneOptions}
                                            placeholder="-- Select --"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Current Status</label>
                                    <CustomSelect
                                        value={formData.status || MemberStatus.Active}
                                        onChange={val => setFormData({ ...formData, status: val as MemberStatus })}
                                        options={STATUS_OPTIONS}
                                    />
                                </div>
                            </div>

                            {formData.status === MemberStatus.ExMember && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl dark:bg-rose-500/10 dark:border-rose-500/20 space-y-4 animate-enter">
                                    <div>
                                        <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5 dark:text-rose-400">Reason for leaving <span className="text-rose-500">*</span></label>
                                        <CustomSelect
                                            value={formData.exMemberReason || ''}
                                            onChange={val => setFormData({ ...formData, exMemberReason: val })}
                                            options={EX_MEMBER_REASON_OPTIONS}
                                            placeholder="-- Select Reason --"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Role / Ministry</label>
                                <CustomSelect
                                    value={formData.role || ''}
                                    onChange={val => setFormData({ ...formData, role: val })}
                                    options={ROLE_OPTIONS}
                                    placeholder="-- Select Role --"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Date Joined</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        value={formData.joinDate || ''}
                                        onChange={e => setFormData({ ...formData, joinDate: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">How did you hear about us? <span className="font-normal normal-case text-slate-400">(Optional)</span></label>
                                <CustomSelect
                                    value={formData.discoverySource || ''}
                                    onChange={val => setFormData({ ...formData, discoverySource: val })}
                                    options={DISCOVERY_SOURCE_OPTIONS}
                                    placeholder="-- Select Source --"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">
                                    Ministry / Role Interest (Church Involvement) <span className="text-rose-500">*</span>
                                </label>
                                <CustomSelect
                                    value={formData.interest || ''}
                                    onChange={val => setFormData({ ...formData, interest: val })}
                                    options={interestOptions}
                                    placeholder="-- Select Interest --"
                                />
                                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">What role or ministry area is this member interested in serving in?</p>
                            </div>

                            {/* Baptism Details */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            💧 Baptism Status
                                        </h4>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1 dark:text-slate-400">Has the member been baptized?</p>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-lg dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({
                                                ...formData,
                                                isBaptized: true
                                            })}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.isBaptized === true
                                                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({
                                                ...formData,
                                                isBaptized: false,
                                                baptismDate: null,
                                                baptizedBy: null,
                                                baptismChurch: null,
                                                brothersKeeper: null
                                            })}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.isBaptized === false || formData.isBaptized === undefined
                                                    ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                {formData.isBaptized && (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl dark:bg-slate-800/60 dark:border-slate-700 space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Date of Baptism</label>
                                            <input
                                                type="date"
                                                value={formData.baptismDate || ''}
                                                onChange={e => setFormData({ ...formData, baptismDate: e.target.value })}
                                                className="w-full h-[50px] px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white text-slate-600"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Baptized By</label>
                                                <input
                                                    type="text"
                                                    value={formData.baptizedBy || ''}
                                                    onChange={e => setFormData({ ...formData, baptizedBy: e.target.value })}
                                                    placeholder="Pastor's Name"
                                                    className="w-full h-[50px] px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Church / Location</label>
                                                <input
                                                    type="text"
                                                    value={formData.baptismChurch || ''}
                                                    onChange={e => setFormData({ ...formData, baptismChurch: e.target.value })}
                                                    placeholder="Where were they baptized?"
                                                    className="w-full h-[50px] px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Brother's Keeper <span className="text-slate-400 font-normal normal-case text-[11px]">(optional)</span></label>
                                            <input
                                                type="text"
                                                value={formData.brothersKeeper || ''}
                                                onChange={e => setFormData({ ...formData, brothersKeeper: e.target.value })}
                                                placeholder="Name of spiritual mentor or accountability partner"
                                                className="w-full h-[50px] px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: EMPLOYMENT & BACKGROUND */}
                    {currentStep === 5 && (
                        <div className={`space-y-6 ${direction === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Employment & Background</h3>
                                <p className="text-slate-500 text-sm dark:text-slate-400">Employment, education and profile notes</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Employment Status</label>
                                    <CustomSelect
                                        value={occupationDetails.status}
                                        onChange={val => handleOccupationChange({ status: val as any })}
                                        options={EMPLOYMENT_STATUS_OPTIONS}
                                        placeholder="-- Select Employment Status --"
                                    />
                                </div>

                                {(occupationDetails.status === 'Employed' || occupationDetails.status === 'Self-Employed') && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl dark:bg-slate-800/60 dark:border-slate-700 animate-enter">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">
                                                {occupationDetails.status === 'Self-Employed' ? 'What do you do? (Nature of Business)' : 'What do you do? (Job Title)'}
                                            </label>
                                            <input
                                                type="text"
                                                value={occupationDetails.role || ''}
                                                onChange={e => handleOccupationChange({ role: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                                placeholder={occupationDetails.status === 'Self-Employed' ? 'e.g. Retail Shop, Farming, Consulting' : 'e.g. Software Engineer, Teacher, Doctor'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">
                                                {occupationDetails.status === 'Self-Employed' ? 'Where is your business? (Business Name/Location)' : 'Where do you work? (Employer)'}
                                            </label>
                                            <input
                                                type="text"
                                                value={occupationDetails.organization || ''}
                                                onChange={e => handleOccupationChange({ organization: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                                placeholder={occupationDetails.status === 'Self-Employed' ? 'e.g. Main Market, Home-based, Accra' : 'e.g. Google, City Hospital, Self-employed'}
                                            />
                                        </div>
                                    </div>
                                )}

                                {occupationDetails.status === 'Student' && (
                                    <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl dark:bg-slate-800/60 dark:border-slate-700 animate-enter">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">What school do you go to?</label>
                                                <input
                                                    type="text"
                                                    value={occupationDetails.organization || ''}
                                                    onChange={e => handleOccupationChange({ organization: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                                    placeholder="e.g. Stanford University, Oak High School"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Where is the school located?</label>
                                                <input
                                                    type="text"
                                                    value={occupationDetails.location || ''}
                                                    onChange={e => handleOccupationChange({ location: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                                    placeholder="e.g. Palo Alto, CA or Boston, MA"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">What are you studying? (Optional)</label>
                                            <input
                                                type="text"
                                                value={occupationDetails.role || ''}
                                                onChange={e => handleOccupationChange({ role: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400"
                                                placeholder="e.g. Computer Science, Grade 10, Biology"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Highest Education */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Highest Education</label>
                                    {(() => {
                                        const selectValue = formData.education
                                            ? (isStandardEducation(formData.education) ? formData.education : 'Other')
                                            : '';
                                        const showCustomInput = (formData.education && !isStandardEducation(formData.education)) || selectValue === 'Other';

                                        return (
                                            <div className="space-y-4">
                                                <CustomSelect
                                                    value={selectValue}
                                                    onChange={val => {
                                                        if (val === 'Other') {
                                                            setFormData({ ...formData, education: 'Other' });
                                                        } else {
                                                            setFormData({ ...formData, education: val });
                                                        }
                                                    }}
                                                    options={EDUCATION_OPTIONS}
                                                    placeholder="-- Select Highest Education --"
                                                />
                                                {showCustomInput && (
                                                    <div className="animate-enter">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Specify Education Level</label>
                                                        <input
                                                            type="text"
                                                            value={formData.education === 'Other' ? '' : formData.education}
                                                            onChange={e => setFormData({ ...formData, education: e.target.value })}
                                                            placeholder="e.g. Higher National Diploma, Professional Certificate"
                                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-slate-400 text-slate-600"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Additional Notes */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">Additional Notes</label>
                                    <textarea
                                        value={formData.notes || ''}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all h-20 resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        placeholder="Anything else we should know?"
                                    />
                                </div>
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

                    {currentStep < 5 ? (
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
