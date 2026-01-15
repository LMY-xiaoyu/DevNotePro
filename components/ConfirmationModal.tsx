
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  title, 
  content, 
  confirmText = '确定', 
  cancelText = '取消', 
  isDanger = false,
  onConfirm, 
  onClose 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="w-[300px] bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200 scale-100">
        
        <div className="p-5 flex flex-col items-center text-center">
          <div className={`mb-3 p-3 rounded-full bg-zinc-50 dark:bg-zinc-800 ${isDanger ? 'text-red-500' : 'text-blue-500'}`}>
            <AlertCircle size={24} />
          </div>
          
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-sm">
            {title}
          </h3>
          
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed px-2">
            {content}
          </p>
        </div>
        
        <div className="flex border-t border-zinc-100 dark:border-zinc-800 divide-x divide-zinc-100 dark:divide-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-3 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
              isDanger 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-blue-600 dark:text-blue-400'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
