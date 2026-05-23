import { RefObject, useEffect } from 'react';

export const useHorizontalWheel = (ref: RefObject<HTMLElement>, enabled = true, deps: unknown[] = []) => {
  useEffect(() => {
    if (!enabled) return;

    const target = ref.current;
    if (!target) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) return;
      e.preventDefault();
      target.scrollBy({ left: e.deltaY, behavior: 'auto' });
    };

    target.addEventListener('wheel', handleWheel, { passive: false });
    return () => target.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ref, ...deps]);
};
