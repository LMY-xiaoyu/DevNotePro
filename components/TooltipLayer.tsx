
import React, { useState, useEffect } from 'react';

export const TooltipLayer: React.FC = () => {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    let timeoutId: any;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]');
      if (target) {
        const text = target.getAttribute('data-tooltip');
        if (text) {
          const rect = target.getBoundingClientRect();
          // Clear any pending clear
          clearTimeout(timeoutId);
          setTooltip({
            text,
            x: rect.left + rect.width / 2,
            y: rect.bottom + 8
          });
          return;
        }
      }
      setTooltip(null);
    };

    const handleMouseOut = (e: MouseEvent) => {
       const target = (e.target as HTMLElement).closest('[data-tooltip]');
       if (target) {
         setTooltip(null);
       }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    const handleScroll = () => setTooltip(null);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  if (!tooltip) return null;

  return (
    <div
      className="fixed z-[9999] px-2.5 py-1.5 text-xs font-medium text-white bg-zinc-800 dark:bg-zinc-700 rounded-md shadow-xl border border-zinc-700/50 pointer-events-none transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
      style={{ top: tooltip.y, left: tooltip.x }}
    >
      {tooltip.text}
    </div>
  );
};
