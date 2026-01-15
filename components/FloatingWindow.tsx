
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface FloatingWindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  transparency: number;
  zIndex: number;
  onFocus: () => void;
  initialPosition?: { x: number; y: number };
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({ 
  id, 
  title,
  children, 
  onClose, 
  transparency, 
  zIndex, 
  onFocus,
  initialPosition = { x: 100, y: 100 }
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    onFocus(); // Bring to front when clicked
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={windowRef}
      id={`floating-window-${id}`}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: '600px',
        height: '400px',
        opacity: transparency / 100,
        zIndex: zIndex
      }}
      className="fixed top-0 left-0 shadow-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col bg-white dark:bg-zinc-950 transition-shadow duration-200"
    >
      <div className="drag-handle h-8 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-between px-3 cursor-move border-b border-zinc-200 dark:border-zinc-800 select-none">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-[10px] text-zinc-500 font-bold truncate ml-2 max-w-[300px]">{title}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="text-zinc-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 no-drag"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

export default FloatingWindow;
