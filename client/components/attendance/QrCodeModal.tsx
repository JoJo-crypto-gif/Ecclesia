import React, { useState } from 'react';
import { 
  Calendar, CheckCircle2, Copy, ExternalLink, Printer 
} from 'lucide-react';
import Modal from '../Modal';
import { ChurchEvent, EventInstance } from '../../types';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ChurchEvent | null;
  instance: EventInstance | null;
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose, event, instance }) => {
  const [copyFeedback, setCopyFeedback] = useState(false);

  if (!event) return null;

  // Use instance ID for check-in URL if available, otherwise fall back to event ID
  const targetId = instance?.id || event.id;
  const displayDate = instance ? new Date(instance.date) : new Date();

  const getCheckInUrl = (id: string) => {
    const origin = window.location.origin;
    return `${origin}/#/check-in/${id}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getCheckInUrl(targetId));
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handlePrintQR = () => {
    const url = getCheckInUrl(targetId);
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
    
    const printWindow = window.open('', '', 'width=800,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Check-in QR - ${event.name}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Plus Jakarta Sans', sans-serif; }
              @media print {
                @page { margin: 0; }
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body class="bg-white flex items-center justify-center min-h-screen p-8 text-center">
            <div class="max-w-2xl w-full border-4 border-slate-900 rounded-3xl p-12 flex flex-col items-center">
               <div class="mb-8 uppercase tracking-widest font-bold text-slate-500 text-xl">Scan to Check In</div>
               
               <h1 class="text-6xl font-extrabold text-slate-900 mb-4 leading-tight">${event.name}</h1>
               <div class="text-2xl text-slate-600 font-medium mb-12 flex items-center gap-3 justify-center">
                  <span>${displayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
               </div>
               
               <div class="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 mb-10 inline-block">
                 <img src="${qrSrc}" class="w-96 h-96 object-contain mix-blend-multiply" />
               </div>
               
               <p class="text-slate-400 text-lg mb-4">Open your camera app to scan</p>
               <div class="text-xs text-slate-300 font-mono mb-8">${url}</div>
               
               <div class="mt-auto pt-8 border-t border-slate-100 w-full flex justify-between items-center text-slate-400 text-sm">
                  <span class="font-bold tracking-widest uppercase">Ecclesia Manager</span>
                  <span class="bg-slate-100 px-3 py-1 rounded-full">${event.type}</span>
               </div>
            </div>
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 800);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Scan to Check In"
        maxWidth="max-w-2xl"
      >
         <div className="p-8">
             <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xl flex-shrink-0 dark:bg-slate-800 dark:border-slate-700">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getCheckInUrl(targetId))}`} 
                        alt="QR Code" 
                        className="w-64 h-64 object-contain rounded-xl"
                    />
                </div>
                
                <div className="text-center md:text-left flex-1">
                    <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {event.type}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white leading-tight">{event.name}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 mb-6 dark:text-slate-400 font-medium">
                         <Calendar size={18} />
                         <span>{displayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                    
                    <p className="text-slate-500 mb-6 dark:text-slate-400 text-sm leading-relaxed">
                        Members can scan this code using their mobile camera to check in instantly.
                    </p>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Public Check-in Link</label>
                        <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 dark:bg-slate-800 dark:border-slate-700 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                            <span className="text-xs text-slate-500 font-mono truncate max-w-[200px] dark:text-slate-400">{getCheckInUrl(targetId)}</span>
                            <button 
                                onClick={handleCopyLink}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors dark:text-indigo-400 dark:hover:bg-indigo-500/20 relative group"
                                title="Copy to clipboard"
                            >
                                {copyFeedback ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                {copyFeedback && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                        Copied!
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
             </div>
             
             <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4 w-full dark:border-slate-800">
                 <button 
                    onClick={() => window.open(getCheckInUrl(targetId), '_blank')}
                    className="flex-1 py-3.5 text-slate-700 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
                 >
                     <ExternalLink size={18} /> Open Link
                 </button>
                 <button 
                    onClick={handlePrintQR}
                    className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                 >
                     <Printer size={18} /> Print Flyer
                 </button>
             </div>
         </div>
      </Modal>
  );
};

export default QrCodeModal;
