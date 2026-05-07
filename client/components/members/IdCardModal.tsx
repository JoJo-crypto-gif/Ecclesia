import React from 'react';
import { Printer } from 'lucide-react';
import Modal from '../Modal';
import { MemberIdCard } from '../MemberIdCard';
import { Member } from '../../types';
import { getMemberDisplayName } from '../../utils/memberName';

interface IdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  zoneName?: string;
}

const IdCardModal: React.FC<IdCardModalProps> = ({ isOpen, onClose, member, zoneName }) => {
  const handlePrintIdCard = () => {
    const printContent = document.getElementById('printable-id-card');
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      const cardOwner = getMemberDisplayName(member, { includeOtherName: false }) || 'Member';
      printWindow.document.write(`
        <html>
          <head>
            <title>Print ID Card - ${cardOwner}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; }
              @media print { 
                body { background: white; -webkit-print-color-adjust: exact; }
                .no-print { display: none; }
                #printable-id-card { flex-direction: row !important; gap: 20px !important; }
              }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
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
      title="ID Card Preview"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col items-center space-y-8 p-6">
        <div className="bg-slate-100 p-8 rounded-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" id="printable-id-card">
          {member && (
            <MemberIdCard
              member={member}
              zoneName={zoneName}
            />
          )}
        </div>

        <div className="flex gap-4 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Close
          </button>
          <button
            onClick={handlePrintIdCard}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Printer size={20} />
            Print Now
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default IdCardModal;
