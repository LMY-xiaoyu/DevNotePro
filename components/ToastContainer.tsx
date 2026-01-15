
import React from 'react';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
  position?: 'bottom-right' | 'top-center';
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast, position = 'bottom-right' }) => {
  const positionClasses = position === 'top-center'
    ? 'top-12 left-1/2 -translate-x-1/2 items-center'
    : 'bottom-32 right-8 items-end';

  return (
    <div className={`fixed flex flex-col gap-2 z-[300] pointer-events-none w-full max-w-sm transition-all ${positionClasses}`}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-md animate-in fade-in duration-200 ${
            position === 'top-center' ? 'slide-in-from-top-2' : 'slide-in-from-right-2'
          } ${
            toast.type === 'success' ? 'bg-green-50/90 dark:bg-green-950/80 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' :
            toast.type === 'warning' ? 'bg-amber-50/90 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' :
            'bg-zinc-50/90 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
        >
          {toast.type === 'success' && <CheckCircle size={14} className="shrink-0" />}
          {toast.type === 'info' && <Info size={14} className="shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle size={14} className="shrink-0" />}
          
          <span className="text-xs font-medium whitespace-nowrap">{toast.message}</span>
          
          <button 
            onClick={() => removeToast(toast.id)}
            className="ml-1 p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors opacity-60 hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
