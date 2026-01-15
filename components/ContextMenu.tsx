
import React, { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [onClose]);

  // Prevent menu from going off-screen (basic logic)
  const style: React.CSSProperties = {
    top: Math.min(y, window.innerHeight - (items.length * 40)),
    left: Math.min(x, window.innerWidth - 200),
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-[9999] min-w-[180px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col"
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            item.action();
            onClose();
          }}
          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
            item.danger 
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30' 
              : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {item.icon && <span className="opacity-70">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
