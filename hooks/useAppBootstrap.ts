import { Dispatch, MutableRefObject, SetStateAction, useEffect } from 'react';
import { Folder, Note, Settings, Toast } from '../types';
import { FOLDERS_STORAGE_KEY, LOCAL_STORAGE_KEY } from '../constants/storage';
import { ipcClient } from '../services/ipcClient';
import { createFallbackNote, createWelcomeNote } from '../utils/noteFactory';

interface AppBootstrapOptions {
  isFloatingWindow: boolean;
  floatingNoteId: string | null;
  isUnsaved: boolean;
  settingsRef: MutableRefObject<Settings>;
  setNotes: Dispatch<SetStateAction<Note[]>>;
  setEditingNotes: Dispatch<SetStateAction<Map<string, Note>>>;
  setCustomFolders: Dispatch<SetStateAction<Folder[]>>;
  setSettings: Dispatch<SetStateAction<Settings>>;
  setActiveNoteId: Dispatch<SetStateAction<string | null>>;
  setOpenNoteIds: Dispatch<SetStateAction<string[]>>;
  setUnsavedNoteIds: Dispatch<SetStateAction<Set<string>>>;
  addToast: (message: string, type?: Toast['type']) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
}

const loadLocalNotes = () => {
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!localData) return null;

  try {
    const localNotes = JSON.parse(localData);
    return localNotes && localNotes.length > 0 ? localNotes as Note[] : null;
  } catch (e) {
    console.error('Failed to parse local notes:', e);
    return null;
  }
};

const loadLocalFolders = () => {
  const localFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
  if (!localFolders) return null;

  try {
    return JSON.parse(localFolders) as Folder[];
  } catch (e) {
    console.error('Failed to parse local folders:', e);
    return null;
  }
};

export const useAppBootstrap = ({
  isFloatingWindow,
  floatingNoteId,
  isUnsaved,
  settingsRef,
  setNotes,
  setEditingNotes,
  setCustomFolders,
  setSettings,
  setActiveNoteId,
  setOpenNoteIds,
  setUnsavedNoteIds,
  addToast,
  onNewNote,
  onOpenSettings,
}: AppBootstrapOptions) => {
  useEffect(() => {
    const initData = async () => {
      let loadedNotes: Note[] | null = null;
      let loadedFolders: Folder[] | null = null;
      let savedSettings: Settings | null = null;

      if (ipcClient.isAvailable()) {
        try {
          loadedNotes = await ipcClient.readNotes().catch((err: any) => {
            console.error('Failed to read notes via IPC:', err);
            return [];
          });
          loadedFolders = await ipcClient.readFolders().catch((err: any) => {
            console.error('Failed to read folders via IPC:', err);
            return [];
          });
          savedSettings = await ipcClient.readSettings().catch((err: any) => {
            console.error('Failed to read settings via IPC:', err);
            return null;
          });

          ipcClient.on('notes-updated', (updatedNotes: Note[]) => setNotes(updatedNotes));
          ipcClient.on('note-updated-single', (updatedNote: Note) => {
            setNotes(prev => {
              const exists = prev.find(n => n.id === updatedNote.id);
              return exists ? prev.map(n => n.id === updatedNote.id ? updatedNote : n) : [updatedNote, ...prev];
            });
          });
          ipcClient.on('folders-updated', (updatedFolders: Folder[]) => setCustomFolders(updatedFolders));
          ipcClient.on('settings-updated', (newSettings: Settings) => {
            if (JSON.stringify(newSettings) !== JSON.stringify(settingsRef.current)) setSettings(newSettings);
          });
          ipcClient.on('new-note', () => {
            if (!isFloatingWindow) onNewNote();
          });
          ipcClient.on('open-settings', () => {
            if (!isFloatingWindow) onOpenSettings();
          });
        } catch (e) {
          console.error(e);
        }
      }

      if (!loadedNotes || loadedNotes.length === 0) loadedNotes = loadLocalNotes();
      if (!loadedFolders) loadedFolders = loadLocalFolders();

      if (loadedNotes && loadedNotes.length > 0) {
        const initialCount = loadedNotes.length;
        loadedNotes = loadedNotes.filter(note => {
          if (!note) return false;

          const isBlank = (!note.title || note.title.trim() === '') &&
            (!note.content || note.content.trim() === '') &&
            (!note.tags || note.tags.length === 0);

          if (isBlank) {
            if (ipcClient.isAvailable() && note.id) ipcClient.deleteNote(note.id);
            return false;
          }

          return true;
        });

        const deletedCount = initialCount - loadedNotes.length;
        if (deletedCount > 0 && !isFloatingWindow) {
          addToast(`已自动清理 ${deletedCount} 条空白笔记`, 'info');
        }
      }

      if (loadedNotes) {
        setNotes(loadedNotes);
        setEditingNotes(new Map());

        if (loadedNotes.length > 0) {
          if (!isFloatingWindow) {
            const lastNote = loadedNotes[0];
            setActiveNoteId(lastNote.id);
            setOpenNoteIds([lastNote.id]);
          } else if (floatingNoteId) {
            setActiveNoteId(floatingNoteId);
            const noteExists = loadedNotes.some(note => note.id === floatingNoteId);

            if (!noteExists && ipcClient.isAvailable()) {
              ipcClient.readNote(floatingNoteId)
                .then(note => setNotes(prev => [note || createFallbackNote(floatingNoteId), ...prev]))
                .catch(err => {
                  console.error('Failed to read note:', err);
                  setNotes(prev => [createFallbackNote(floatingNoteId), ...prev]);
                });
            }

            if (isUnsaved) {
              setUnsavedNoteIds(prev => {
                const next = new Set(prev);
                next.add(floatingNoteId);
                return next;
              });
            }
          }
        } else if (!isFloatingWindow) {
          const welcome = createWelcomeNote();
          setNotes([welcome]);
          setActiveNoteId(welcome.id);
          setOpenNoteIds([welcome.id]);
        } else if (floatingNoteId) {
          const newNote = createFallbackNote(floatingNoteId);
          setNotes([newNote]);
          setActiveNoteId(floatingNoteId);
        }
      } else if (isFloatingWindow && floatingNoteId) {
        const newNote = createFallbackNote(floatingNoteId);
        setNotes([newNote]);
        setActiveNoteId(floatingNoteId);
      }

      if (loadedFolders) setCustomFolders(loadedFolders);
      if (savedSettings) setSettings(prev => ({ ...prev, ...savedSettings }));
    };

    initData();
  }, [
    addToast,
    floatingNoteId,
    isFloatingWindow,
    isUnsaved,
    onNewNote,
    onOpenSettings,
    setActiveNoteId,
    setCustomFolders,
    setEditingNotes,
    setNotes,
    setOpenNoteIds,
    setSettings,
    setUnsavedNoteIds,
    settingsRef,
  ]);
};
