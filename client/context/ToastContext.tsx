import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const { id, message, type, duration = 4000 } = toast;
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(id), 300); // wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(id), 300);
  };

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50/90 dark:bg-emerald-950/30',
          border: 'border-emerald-200 dark:border-emerald-500/20',
          text: 'text-emerald-800 dark:text-emerald-300',
          progress: 'bg-emerald-500',
          icon: CheckCircle,
          iconColor: 'text-emerald-500',
        };
      case 'error':
        return {
          bg: 'bg-rose-50/90 dark:bg-rose-950/30',
          border: 'border-rose-200 dark:border-rose-500/20',
          text: 'text-rose-800 dark:text-rose-300',
          progress: 'bg-rose-500',
          icon: AlertCircle,
          iconColor: 'text-rose-500',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/90 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-500/20',
          text: 'text-amber-800 dark:text-amber-300',
          progress: 'bg-amber-500',
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
        };
      case 'info':
      default:
        return {
          bg: 'bg-indigo-50/90 dark:bg-indigo-950/30',
          border: 'border-indigo-200 dark:border-indigo-500/20',
          text: 'text-indigo-800 dark:text-indigo-300',
          progress: 'bg-indigo-500',
          icon: Info,
          iconColor: 'text-indigo-500',
        };
    }
  };

  const styles = getToastStyles();
  const Icon = styles.icon;

  return (
    <div
      className={`relative max-w-sm w-full backdrop-blur-xl border rounded-2xl shadow-xl flex flex-col overflow-hidden pointer-events-auto transition-all duration-300 ease-spring select-none
        ${styles.bg} ${styles.border} ${styles.text}
        ${isExiting ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
        animate-in slide-in-from-right duration-300`}
    >
      <div className="p-4 flex items-start gap-3">
        <Icon size={20} className={`${styles.iconColor} shrink-0 mt-0.5`} />
        <div className="flex-1 text-sm font-semibold leading-snug">{message}</div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-slate-500/10 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
        >
          <X size={15} />
        </button>
      </div>
      
      {/* Animated Timer Progress Bar */}
      <div className="h-1 w-full bg-slate-500/5 dark:bg-white/5 overflow-hidden">
        <div
          className={`h-full ${styles.progress}`}
          style={{
            animation: `shrink-progress ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, removeToast }}>
      {children}
      
      {/* Inline Styles for Progress Bar Keyframes */}
      <style>{`
        @keyframes shrink-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* Floating Toasts Portal Container */}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
