import { Dispatch, SetStateAction, useEffect } from 'react';
import { Note } from '../types';
import { ipcClient } from '../services/ipcClient';

interface FloatingNoteLoaderOptions {
  enabled: boolean;
  noteId: string | null;
  hasLocalNote: boolean;
  setNotes: Dispatch<SetStateAction<Note[]>>;
}

export const useFloatingNoteLoader = ({ enabled, noteId, hasLocalNote, setNotes }: FloatingNoteLoaderOptions) => {
  useEffect(() => {
    if (!enabled || !noteId || hasLocalNote || !ipcClient.isAvailable()) return;

    let isCancelled = false;

    ipcClient.readNote(noteId)
      .then(note => {
        if (!note || isCancelled) return;

        setNotes(prev => {
          const exists = prev.some(n => n.id === note.id);
          return exists ? prev.map(n => n.id === note.id ? note : n) : [note, ...prev];
        });
      })
      .catch(err => {
        console.error('Failed to read note:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [enabled, hasLocalNote, noteId, setNotes]);
};
