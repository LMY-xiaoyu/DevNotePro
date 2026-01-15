
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Layout, LogOut } from 'lucide-react';

interface SystemTrayProps {
  onOpenApp: () => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
  accentColor: string;
}

const SystemTray: React.FC<SystemTrayProps> = ({ onOpenApp, onNewNote, onOpenSettings, onExit, accentColor }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed bottom-0 right-0 p-1 flex items-center z-[200]">
      {showMenu && (
        <div 
          ref={menuRef}
          className="absolute bottom-12 right-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 z-[201]"
        >
          <div className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 mb-1">
            系统托盘选项
          </div>
          <button 
            onClick={() => { onOpenApp(); setShowMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Layout size={16} /> 打开主界面
          </button>
          <button 
            onClick={() => { onNewNote(); setShowMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus size={16} /> 新建笔记
          </button>
          <button 
            onClick={() => { onOpenSettings(); setShowMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings size={16} /> 软件设置
          </button>
          <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />
          <button 
            onClick={onExit}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <LogOut size={16} /> 退出程序
          </button>
        </div>
      )}

      <div 
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center justify-center w-10 h-10 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors relative no-drag"
      >
        <div 
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          D
        </div>
        <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 border-2 border-zinc-50 dark:border-zinc-950 rounded-full" />
      </div>
    </div>
  );
};

export default SystemTray;
