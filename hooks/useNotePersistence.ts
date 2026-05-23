import { Dispatch, SetStateAction, useCallback } from 'react';
import { Folder, Note, Toast } from '../types';
import { ipcClient } from '../services/ipcClient';
import { FOLDERS_STORAGE_KEY, LOCAL_STORAGE_KEY } from '../constants/storage';

interface NotePersistenceOptions {
  notes: Note[];
  editingNotes: Map<string, Note>;
  setNotes: Dispatch<SetStateAction<Note[]>>;
  setEditingNotes: Dispatch<SetStateAction<Map<string, Note>>>;
  setUnsavedNoteIds: Dispatch<SetStateAction<Set<string>>>;
  addToast: (message: string, type?: Toast['type']) => void;
}

export const useNotePersistence = ({
  notes,
  editingNotes,
  setNotes,
  setEditingNotes,
  setUnsavedNoteIds,
  addToast,
}: NotePersistenceOptions) => {
  const saveNotesToDisk = useCallback(async (currentNotes: Note[], savedNoteId?: string, silent = false) => {
    let success = false;
    let errorMsg = '';

    let noteToSave: Note | undefined;
    if (savedNoteId) {
      const noteFromCurrentNotes = currentNotes.find(n => n.id === savedNoteId);
      noteToSave = currentNotes !== notes
        ? noteFromCurrentNotes
        : editingNotes.get(savedNoteId) || noteFromCurrentNotes;
      if (!noteToSave) noteToSave = notes.find(n => n.id === savedNoteId);
    }

    if (ipcClient.isAvailable()) {
      if (savedNoteId && noteToSave) {
        const result = await ipcClient.saveNote(noteToSave);
        if (result.success) success = true; else errorMsg = result.error ?? '';
      } else if (savedNoteId && !noteToSave) {
        errorMsg = '笔记未找到';
      } else {
        const notesToSave = currentNotes.map(note => editingNotes.get(note.id) || note).filter(Boolean);
        const result = await ipcClient.saveNotes(notesToSave);
        if (result.success) success = true; else errorMsg = result.error ?? '';
      }
    } else {
      try {
        const notesToSave = currentNotes.map(note => editingNotes.get(note.id) || note).filter(Boolean);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesToSave));
        success = true;
      } catch {
        errorMsg = 'Local Storage Full';
      }
    }

    if (success) {
      if (!silent) addToast('已保存', 'success');

      if (savedNoteId && noteToSave) {
        setNotes(prev => {
          const exists = prev.find(n => n.id === savedNoteId);
          return exists ? prev.map(n => n.id === savedNoteId ? noteToSave! : n) : [...prev, noteToSave!];
        });
        setEditingNotes(prev => {
          const next = new Map(prev);
          next.delete(savedNoteId);
          return next;
        });
        setUnsavedNoteIds(prev => {
          const next = new Set(prev);
          next.delete(savedNoteId);
          return next;
        });
      } else {
        const updatedNotes = currentNotes.map(note => editingNotes.get(note.id) || note).filter(Boolean);
        setNotes(updatedNotes);
        setEditingNotes(new Map());
        setUnsavedNoteIds(new Set());
      }
    }

    if (!success) addToast('保存失败: ' + errorMsg, 'warning');
  }, [addToast, editingNotes, notes, setEditingNotes, setNotes, setUnsavedNoteIds]);

  const saveFoldersToDisk = useCallback(async (folders: Folder[]) => {
    if (ipcClient.isAvailable()) await ipcClient.saveFolders(folders);
    else localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  }, []);

  return { saveNotesToDisk, saveFoldersToDisk };
};
