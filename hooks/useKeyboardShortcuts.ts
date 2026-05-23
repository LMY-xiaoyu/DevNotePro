import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  disabled?: boolean;
  onSave?: () => void;
  onNewNote?: () => void;
  onFocusSearch?: () => void;
}

export const useKeyboardShortcuts = ({ disabled = false, onSave, onNewNote, onFocusSearch }: KeyboardShortcutOptions) => {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        onSave?.();
      } else if (key === 'n') {
        e.preventDefault();
        onNewNote?.();
      } else if (key === 'f') {
        e.preventDefault();
        onFocusSearch?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onFocusSearch, onNewNote, onSave]);
};
