import React from 'react';
import { Menu, X, Bell } from 'lucide-react';
import Logo from './Logo';

interface MobileHeaderProps {
  isOpen: boolean;
  toggleMenu: () => void;
  title?: string;
  logo?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ isOpen, toggleMenu, title = "Ecclesia", logo }) => {
  return (
    <header className="lg:hidden sticky top-0 z-[60] flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-lg border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 transition-all duration-300">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleMenu}
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="flex items-center gap-2">
            <Logo size="sm" overrideSrc={logo} className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-all dark:hover:bg-slate-800 relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>
      </div>
    </header>
  );
};

export default MobileHeader;
