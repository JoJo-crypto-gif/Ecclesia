import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  fullWidth = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleSelect = (optionValue: string | number) => {
    if (disabled) return;
    onChange(String(optionValue));
    setIsOpen(false);
  };

  const IconComponent = selectedOption?.icon;

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full' : 'w-auto'} ${className}`}
    >
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border transition-all text-left font-semibold outline-none
          ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-600'
              : isOpen
              ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 text-slate-800 dark:bg-slate-900 dark:border-indigo-500 dark:text-white'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-200'
          }`}
      >
        <span className="flex items-center gap-2 truncate">
          {IconComponent && <IconComponent size={18} className="text-slate-500 dark:text-slate-400" />}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown
          size={18}
          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-[80] left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-enter">
          <ul className="max-h-60 overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {options.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
                No options available
              </li>
            ) : (
              options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const ItemIcon = opt.icon;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold transition-all
                        ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {ItemIcon && (
                          <ItemIcon
                            size={16}
                            className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                          />
                        )}
                        <span>{opt.label}</span>
                      </span>
                      {isSelected && (
                        <Check size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
