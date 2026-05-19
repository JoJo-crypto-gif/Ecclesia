import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from "html5-qrcode";
import { useData } from '../context/DataContext';
import { X, CheckCircle2, AlertCircle, ScanLine, User } from 'lucide-react';
import { Member, EventInstance, ChurchEvent } from '../types';
import { apiFetch } from '../utils/api';

// Simple beep sound (base64)
const BEEP_AUDIO = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder short blip

const KioskMode: React.FC = () => {
  const { instanceId } = useParams();
  const { events, members, checkIn } = useData();
  const navigate = useNavigate();

  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'duplicate' | 'error'>('idle');
  const [scannedMember, setScannedMember] = useState<Member | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [instanceInfo, setInstanceInfo] = useState<EventInstance | null>(null);
  const [eventInfo, setEventInfo] = useState<ChurchEvent | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  // Refs for managing state inside the scanner callback (which runs in a closure)
  const scanStatusRef = useRef(scanStatus);
  const lastScannedRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);

  // Sync scanStatus ref
  useEffect(() => {
    scanStatusRef.current = scanStatus;
  }, [scanStatus]);

  // Fetch instance info
  useEffect(() => {
    if (!instanceId) return;
    apiFetch(`/api/events/instances/${instanceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setInstanceInfo(data.data);
          const event = events.find(e => e.id === data.data.eventId);
          setEventInfo(event || null);
        }
      })
      .catch(console.error);
  }, [instanceId, events]);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio(BEEP_AUDIO);
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const playAudio = (freq: number) => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        setTimeout(() => osc.stop(), 300);
    }
  };

  const handleScan = useCallback(async (code: string) => {
    if (!instanceId) return;

    // Send the code directly to the backend
    // The backend now handles looking up the member by ID, Phone, or Email
    try {
      const result = await checkIn(instanceId, undefined, code);

      if (result.success) {
        if (result.message?.includes('already')) {
          setScanStatus('duplicate');
          playAudio(400);
        } else {
          setScanStatus('success');
          playAudio(800);
        }
        
        // If the backend found a member, it returns it in result.member
        if (result.member) {
          setScannedMember(result.member);
        } else {
          // Otherwise it's a visitor check-in
          setScannedMember(null); 
        }
      } else {
        setScanStatus('error');
        setErrorMessage(result.message || "Check-in failed");
        playAudio(200);
      }
    } catch (err) {
      setScanStatus('error');
      setErrorMessage("Check-in failed");
      playAudio(200);
    }

    // Reset after 3 seconds
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setScanStatus('idle');
        setScannedMember(null);
        setErrorMessage('');
        lastScannedRef.current = null;
      }
    }, 3000);
  }, [instanceId, checkIn]);

  // Keep a ref to the handleScan function so the scanner can always call the latest version
  const handleScanRef = useRef(handleScan);
  useEffect(() => { handleScanRef.current = handleScan; }, [handleScan]);

  useEffect(() => {
    // START SCANNER LOGIC
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;
    
    const qrCodeSuccessCallback = (decodedText: string) => {
      if (scanStatusRef.current !== 'idle') return;
      if (lastScannedRef.current === decodedText) return;

      lastScannedRef.current = decodedText;
      handleScanRef.current(decodedText);
    };

    // Calculate responsive qrbox size
    const screenWidth = window.innerWidth;
    const qrBoxSize = Math.min(screenWidth * 0.8, 450);
    const config = { fps: 15, qrbox: { width: qrBoxSize, height: qrBoxSize } };

    const startScanner = async () => {
        try {
            await html5QrCode.start(
                { facingMode: facingMode }, 
                config, 
                qrCodeSuccessCallback,
                (err) => { /* ignore frame errors */ }
            );
        } catch (err) {
            console.error("Scanner failed to start:", err);
            if (isMountedRef.current) {
                setErrorMessage("Camera access failed. Please check permissions.");
                setScanStatus('error');
            }
        }
    };

    startScanner();

    // CLEANUP
    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop()
            .then(() => html5QrCode.clear())
            .catch(err => console.error("Failed to stop scanner", err));
      } else {
        html5QrCode.clear();
      }
    };
  }, [facingMode]); // Restart when facingMode changes

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExitClick = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    navigate('/attendance');
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const displayName = eventInfo?.name || 'Event';

  if (!instanceId) return <div className="h-screen flex items-center justify-center text-white bg-black">Instance not found</div>;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-hidden flex flex-col items-center justify-center">
      
      {/* Top Action Bar */}
      <div className="absolute top-0 inset-x-0 z-[60] p-4 flex justify-between items-center pointer-events-none">
        <button 
          onClick={toggleCamera}
          className="p-4 bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto hover:bg-indigo-600/40 transition-all border border-white/10"
          title="Flip Camera"
        >
          <ScanLine size={24} />
        </button>
        <button 
          onClick={handleExitClick}
          className="p-4 bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto hover:bg-red-500/40 transition-all border border-white/10"
        >
          <X size={24} />
        </button>
      </div>

      {/* Exit Confirmation Overlay */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-enter">
            <div className="bg-white text-slate-900 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
                <h3 className="text-2xl font-bold mb-2">Exit Kiosk Mode?</h3>
                <p className="text-slate-500 mb-8">This will stop the scanner and return to the dashboard.</p>
                <div className="flex gap-4">
                    <button 
                        onClick={cancelExit}
                        className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmExit}
                        className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                    >
                        Exit
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Camera View */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div id="reader" className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>video]:transform [&>video]:scale-x-[-1]"></div>
        
        {/* Overlay Container */}
        <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 flex flex-col items-center justify-center
          ${scanStatus === 'idle' ? 'bg-black/10' : ''}
          ${scanStatus === 'success' ? 'bg-emerald-500/80' : ''}
          ${scanStatus === 'duplicate' ? 'bg-amber-500/80' : ''}
          ${scanStatus === 'error' ? 'bg-red-500/80' : ''}
        `}>
            
            {/* Status Messages */}
            {scanStatus === 'idle' && (
                <div className="flex flex-col items-center animate-pulse p-4">
                    <div className="w-[80vw] h-[80vw] max-w-[450px] max-h-[450px] border-4 border-white/50 rounded-3xl flex items-center justify-center mb-8 relative">
                         <div className="absolute inset-0 border-2 border-white/30 rounded-2xl m-2"></div>
                         <ScanLine size={64} className="text-white/80" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight drop-shadow-lg text-center">Scan QR Code</h2>
                    <p className="text-lg sm:text-xl text-white/80 mt-2 font-medium text-center px-4">{displayName}</p>
                </div>
            )}

            {scanStatus === 'success' && scannedMember && (
                <div className="flex flex-col items-center text-center animate-enter p-6">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                        <CheckCircle2 size={56} className="text-emerald-500 sm:size-[64px]" />
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2 drop-shadow-md">Welcome!</h2>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-6 drop-shadow-md">{scannedMember.firstName} {scannedMember.lastName}</h3>
                    <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3">
                         <User size={20} className="text-white" />
                         <span className="font-mono text-sm sm:text-lg">{scannedMember.role || 'Member'}</span>
                    </div>
                </div>
            )}

            {scanStatus === 'success' && !scannedMember && (
                <div className="flex flex-col items-center text-center animate-enter p-6">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                        <CheckCircle2 size={56} className="text-emerald-500 sm:size-[64px]" />
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2 drop-shadow-md">Welcome!</h2>
                    <h3 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4">Visitor Checked In</h3>
                </div>
            )}

            {scanStatus === 'duplicate' && scannedMember && (
                <div className="flex flex-col items-center text-center animate-enter p-6">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                        <CheckCircle2 size={56} className="text-amber-500 sm:size-[64px]" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-md">Already Checked In</h2>
                    <h3 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4">{scannedMember.firstName} {scannedMember.lastName}</h3>
                    <div className="bg-black/20 px-6 py-2 rounded-lg text-sm font-medium text-white/80">
                         {displayName}
                    </div>
                </div>
            )}

            {scanStatus === 'error' && (
                 <div className="flex flex-col items-center text-center animate-enter p-6">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                        <AlertCircle size={56} className="text-red-500 sm:size-[64px]" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-md">Scan Failed</h2>
                    <p className="text-lg sm:text-xl text-white/90 px-4">{errorMessage || "Invalid QR Code"}</p>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default KioskMode;
