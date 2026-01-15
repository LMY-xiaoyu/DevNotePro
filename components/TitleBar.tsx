import React from 'react';
import { Minus, Square, X } from 'lucide-react';

interface TitleBarProps {
  onMinimize: () => void;
  onClose: () => void;
  title: string;
  accentColor: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ onMinimize, onClose, title, accentColor }) => {
  const getIpcRenderer = () => {
    if (typeof window !== 'undefined' && (window as any).require) {
      try {
        return (window as any).require('electron').ipcRenderer;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const handleToggleMaximize = () => {
    const ipc = getIpcRenderer();
    if (ipc) {
      ipc.send('window-toggle-maximize');
    }
  };

  return (
    <div className="h-8 bg-white dark:bg-zinc-950 flex items-center justify-between select-none border-b border-zinc-100 dark:border-zinc-900 drag-handle shrink-0">
      <div className="flex items-center gap-2 px-3">
        <div 
          className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          D
        </div>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[400px]">{title}</span>
      </div>
      
      <div className="flex h-full no-drag">
        <button 
          onClick={onMinimize}
          className="w-12 h-full flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
          title="最小化"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={handleToggleMaximize}
          className="w-12 h-full flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
          title="全屏 / 还原"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={onClose}
          className="w-12 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-zinc-600 dark:text-zinc-400"
          title="关闭 (最小化到系统托盘)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;