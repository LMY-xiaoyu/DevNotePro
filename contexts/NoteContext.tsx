import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Note, Settings, Toast, Folder } from '../types';

const LOCAL_STORAGE_KEY = 'devnote_pro_data_v1';
const SETTINGS_STORAGE_KEY = 'devnote_pro_settings_v1';
const FOLDERS_STORAGE_KEY = 'devnote_pro_folders_v1';

interface NoteContextType {
  notes: Note[];
  customFolders: Folder[];
  openNoteIds: string[];
  activeNoteId: string | null;
  unsavedNoteIds: Set<string>;
  activeFolder: string;
  activeTag: string | null;
  selectedListIds: Set<string>;
  searchQuery: string;
  settings: Settings;
  toasts: Toast[];
  isFloatingWindow: boolean;
  floatingNoteId: string | null;
  isFloatingOnTop: boolean;
  // Actions
  addToast: (message: string, type: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  saveNotesToDisk: (currentNotes: Note[], savedNoteId?: string, silent?: boolean) => Promise<void>;
  saveFoldersToDisk: (folders: Folder[]) => Promise<void>;
  handleAddNote: () => void;
  handleNavigateFolder: (folderId: string) => void;
  handleNavigateTag: (tag: string) => void;
  handleToggleWindowTop: () => void;
  openAddFolderModal: () => void;
  openRenameFolderModal: (id: string) => void;
  handleFolderModalConfirm: (name: string) => void;
  handleDeleteFolder: (id: string) => void;
  handleUpdateNote: (id: string, updates: Partial<Note>) => void;
  handleReorderNotes: (draggedId: string, targetId: string) => void;
  handleDeleteNote: (id: string) => void;
  handleBatchDelete: () => void;
  handleSelectNote: (id: string) => void;
  handleToggleSelect: (id: string) => void;
  handleCloseTab: (id: string, e?: React.MouseEvent, force?: boolean) => void;
  handleTabDragEnd: (e: React.DragEvent, id: string) => void;
  handlePinNote: (id: string) => void;
  handleOpenWindow: (id: string) => void;
  handleMoveNoteRequest: (id: string) => void;
  handleConfirmMoveNote: (tid: string) => void;
  handleAddTagRequest: (id: string) => void;
  handleConfirmAddTag: (tag: string) => void;
  // Setters for UI state
  setSearchQuery: (query: string) => void;
  setActiveNoteId: (id: string | null) => void;
  setOpenNoteIds: (ids: string[]) => void;
  setUnsavedNoteIds: (ids: Set<string>) => void;
  setIsFloatingOnTop: (value: boolean) => void;
  setSettings: (settings: Settings) => void;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export const useNoteContext = () => {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error('useNoteContext must be used within a NoteProvider');
  }
  return context;
};

interface NoteProviderProps {
  children: ReactNode;
}

export const NoteProvider: React.FC<NoteProviderProps> = ({ children }) => {
  const queryParams = new URLSearchParams(window.location.search);
  const floatingNoteId = queryParams.get('noteId');
  const isFloatingWindow = !!floatingNoteId;

  const [notes, setNotes] = useState<Note[]>([]);
  const [customFolders, setCustomFolders] = useState<Folder[]>([]);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(floatingNoteId || null);
  const [unsavedNoteIds, setUnsavedNoteIds] = useState<Set<string>>(new Set());
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFloatingOnTop, setIsFloatingOnTop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [settings, setSettings] = useState<Settings>({
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    accentColor: '#3b82f6',
    fontSize: 14,
    transparency: 100,
    floatingPosition: { x: 100, y: 100, width: 700, height: 500 },
    alwaysOnTop: false,
    minimizeToTray: true,
  });

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const getIpcRenderer = () => {
    if (typeof window !== 'undefined' && (window as any).require) {
      try { return (window as any).require('electron').ipcRenderer; } catch (e) { return null; }
    }
    return null;
  };

  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const saveNotesToDisk = async (currentNotes: Note[], savedNoteId?: string, silent: boolean = false) => {
    const ipcRenderer = getIpcRenderer();
    let success = false;
    let errorMsg = '';
    if (ipcRenderer) {
      if (savedNoteId) {
        const noteToSave = currentNotes.find(n => n.id === savedNoteId);
        if (noteToSave) {
          const result = await ipcRenderer.invoke('save-note', noteToSave);
          if (result.success) success = true; else errorMsg = result.error;
        }
      } else {
        const result = await ipcRenderer.invoke('save-notes', currentNotes);
        if (result.success) success = true; else errorMsg = result.error;
      }
    } else {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentNotes));
        success = true;
      } catch (e) { errorMsg = 'Local Storage Full'; }
    }
    if (success && !silent) addToast('已保存', 'success');
    if (success && savedNoteId) {
      setUnsavedNoteIds(prev => { const next = new Set(prev); next.delete(savedNoteId); return next; });
    }
    if (!success) addToast('保存失败: ' + errorMsg, 'warning');
  };

  const saveFoldersToDisk = async (folders: Folder[]) => {
    const ipcRenderer = getIpcRenderer();
    if (ipcRenderer) await ipcRenderer.invoke('save-folders', folders);
    else localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  };

  const handleAddNote = useCallback(() => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      tags: [],
      folderId: activeFolder === 'all' || activeFolder === 'archive' ? 'all' : activeFolder,
      language: 'text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: false,
      isPinned: false,
    };
    setNotes(prev => {
      const next = [newNote, ...prev];
      saveNotesToDisk(next, newNote.id, true);
      return next;
    });
    if (!isFloatingWindow) {
      setOpenNoteIds(prev => prev.includes(newNote.id) ? prev : [...prev, newNote.id]);
      setActiveNoteId(newNote.id);
    }
    setUnsavedNoteIds(prev => new Set(prev).add(newNote.id));
    addToast('已创建新笔记', 'success');
  }, [activeFolder, isFloatingWindow]);

  const handleAddNoteRef = useRef(handleAddNote);
  useEffect(() => { handleAddNoteRef.current = handleAddNote; }, [handleAddNote]);

  useEffect(() => {
    const initData = async () => {
      try {
        let loadedNotes: Note[] | null = null;
        let loadedFolders: Folder[] | null = null;
        const ipcRenderer = getIpcRenderer();
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

        if (ipcRenderer) {
          try {
            loadedNotes = await ipcRenderer.invoke('read-notes');
            loadedFolders = await ipcRenderer.invoke('read-folders');

            ipcRenderer.on('notes-updated', (_: any, updatedNotes: Note[]) => setNotes(updatedNotes));
            ipcRenderer.on('note-updated-single', (_: any, updatedNote: Note) => {
              setNotes(prev => {
                const exists = prev.find(n => n.id === updatedNote.id);
                return exists ? prev.map(n => n.id === updatedNote.id ? updatedNote : n) : [updatedNote, ...prev];
              });
            });
            ipcRenderer.on('note-deleted', (_: any, deletedNoteId: string) => {
              setNotes(prev => {
                const filteredNotes = prev.filter(note => note.id !== deletedNoteId);
                // 如果删除的是当前活动笔记，需要更新活动笔记ID
                if (activeNoteId === deletedNoteId) {
                  setActiveNoteId(filteredNotes.length > 0 ? filteredNotes[0].id : null);
                }
                return filteredNotes;
              });
              setOpenNoteIds(prev => prev.filter(id => id !== deletedNoteId));
              setUnsavedNoteIds(prev => {
                const next = new Set(prev);
                next.delete(deletedNoteId);
                return next;
              });
            });
            ipcRenderer.on('folders-updated', (_: any, updatedFolders: Folder[]) => setCustomFolders(updatedFolders));
            ipcRenderer.on('settings-updated', (_: any, newSettings: Settings) => {
              if (JSON.stringify(newSettings) !== JSON.stringify(settingsRef.current)) setSettings(newSettings);
            });
            ipcRenderer.on('new-note', () => { if (!isFloatingWindow) handleAddNoteRef.current(); });
          } catch (e) { console.error(e); }
        }

        if (!loadedNotes) {
          const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localData) {
            try {
              loadedNotes = JSON.parse(localData);
            } catch (e) {
              console.error('Error parsing local notes data:', e);
              loadedNotes = [];
            }
          }
        }
        if (!loadedFolders) {
          const localFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
          if (localFolders) {
            try {
              loadedFolders = JSON.parse(localFolders);
            } catch (e) {
              console.error('Error parsing local folders data:', e);
              loadedFolders = [];
            }
          }
        }

        // --- Cleanup logic: Remove blank notes on launch ---
        if (loadedNotes && loadedNotes.length > 0) {
          const initialCount = loadedNotes.length;
          const cleanedNotes = loadedNotes.filter(n => {
            const isBlank = n.title.trim() === '' && n.content.trim() === '' && (!n.tags || n.tags.length === 0);
            if (isBlank) {
              // Remove from disk if using IPC
              if (ipcRenderer) ipcRenderer.invoke('delete-note', n.id);
              return false;
            }
            return true;
          });

          const deletedCount = initialCount - cleanedNotes.length;
          loadedNotes = cleanedNotes;
          
          if (deletedCount > 0 && !isFloatingWindow) {
            addToast(`已自动清理 ${deletedCount} 条空白笔记`, 'info');
          }
        }

        if (loadedNotes && loadedNotes.length > 0) {
          setNotes(loadedNotes);
          if (!isFloatingWindow) {
            const lastNote = loadedNotes[0];
            setActiveNoteId(lastNote.id);
            setOpenNoteIds([lastNote.id]);
          }
        } else if (!isFloatingWindow) {
          const welcome: Note = { id: 'welcome', title: '欢迎使用 DevNote Pro', content: `# 全新高性能架构\n\n- **独立文件存储**: 每个笔记现在保存为独立的 JSON 文件。\n- **图片支持**: 直接粘贴图片到编辑器。\n- **原生独立窗口**: 拖拽标签页向下，变为独立系统窗口。`, tags: ['版本更新'], folderId: 'all', language: 'markdown', createdAt: Date.now(), updatedAt: Date.now(), isArchived: false, isPinned: true };
          setNotes([welcome]);
          setActiveNoteId(welcome.id);
          setOpenNoteIds([welcome.id]);
        }
        if (loadedFolders) setCustomFolders(loadedFolders);
        if (savedSettings) {
          try {
            setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
          } catch (e) {
            console.error('Error parsing settings:', e);
          }
        }
      } catch (e) {
        console.error('Error initializing data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, [isFloatingWindow]);

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes)); }, [notes]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.darkMode);
    const ipc = getIpcRenderer();
    if (ipc) ipc.send('set-always-on-top', isFloatingWindow ? isFloatingOnTop : settings.alwaysOnTop);
  }, [settings, isFloatingWindow, isFloatingOnTop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNotesToDisk(notes, activeNoteId || undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, activeNoteId]);

  const handleNavigateFolder = (folderId: string) => { setActiveFolder(folderId); setActiveTag(null); setSelectedListIds(new Set()); };
  const handleNavigateTag = (tag: string) => { setActiveTag(activeTag === tag ? null : tag); setSelectedListIds(new Set()); };
  const handleToggleWindowTop = () => {
    if (isFloatingWindow) setIsFloatingOnTop(!isFloatingOnTop);
    else { const newSettings = { ...settings, alwaysOnTop: !settings.alwaysOnTop }; setSettings(newSettings); getIpcRenderer()?.send('broadcast-settings', newSettings); }
  };
  const openAddFolderModal = () => {};
  const openRenameFolderModal = (id: string) => {};
  const handleFolderModalConfirm = (name: string) => {};
  const handleDeleteFolder = (id: string) => {};
  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    setUnsavedNoteIds(prev => new Set(prev).add(id));
  };
  const handleReorderNotes = (draggedId: string, targetId: string) => {
    const dIdx = notes.findIndex(n => n.id === draggedId); const tIdx = notes.findIndex(n => n.id === targetId);
    if (dIdx === -1 || tIdx === -1 || dIdx === tIdx) return;
    const next = [...notes]; const [item] = next.splice(dIdx, 1); next.splice(tIdx, 0, item);
    setNotes(next); saveNotesToDisk(next, undefined, true);
  };
  const handleDeleteNote = (id: string) => {
    // This will be implemented in the component
  };
  const handleBatchDelete = () => {
    // This will be implemented in the component
  };
  const handleSelectNote = (id: string) => { if (!openNoteIds.includes(id)) setOpenNoteIds(prev => [...prev, id]); setActiveNoteId(id); };
  const handleToggleSelect = (id: string) => { setSelectedListIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const handleCloseTab = (id: string, e?: React.MouseEvent, force: boolean = false) => {
    e?.stopPropagation();
    // This will be implemented with confirmation modal
    const nextOpen = openNoteIds.filter(oid => oid !== id); setOpenNoteIds(nextOpen);
    setUnsavedNoteIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (activeNoteId === id) setActiveNoteId(nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null);
  };
  const handleTabDragEnd = async (e: React.DragEvent, id: string) => {
    if (e.clientY > 150) {
      const ipc = getIpcRenderer();
      if (ipc) {
        const note = notes.find(n => n.id === id);
        if (note) {
          // 直接传递笔记数据，实现无缝切换
          ipc.invoke('open-note-window', note);
          handleCloseTab(id, undefined, true);
        }
      }
    }
  };
  const handlePinNote = (id: string) => { const n = notes.find(n => n.id === id); if (n) { const updated = { ...n, isPinned: !n.isPinned }; handleUpdateNote(id, { isPinned: !n.isPinned }); saveNotesToDisk(notes.map(note => note.id === id ? updated : note), id, true); } };
  const handleOpenWindow = async (id: string) => {
    const ipc = getIpcRenderer();
    if (ipc) {
      const note = notes.find(n => n.id === id);
      if (note) {
        // 直接传递笔记数据，实现无缝切换
        ipc.invoke('open-note-window', note);
        handleCloseTab(id, undefined, true);
      }
    }
  };
  const handleMoveNoteRequest = (id: string) => {};
  const handleConfirmMoveNote = (tid: string) => {};
  const handleAddTagRequest = (id: string) => {};
  const handleConfirmAddTag = (tag: string) => {};

  const value: NoteContextType = {
    notes,
    customFolders,
    openNoteIds,
    activeNoteId,
    unsavedNoteIds,
    activeFolder,
    activeTag,
    selectedListIds,
    searchQuery,
    settings,
    toasts,
    isFloatingWindow,
    floatingNoteId,
    isFloatingOnTop,
    addToast,
    removeToast,
    saveNotesToDisk,
    saveFoldersToDisk,
    handleAddNote,
    handleNavigateFolder,
    handleNavigateTag,
    handleToggleWindowTop,
    openAddFolderModal,
    openRenameFolderModal,
    handleFolderModalConfirm,
    handleDeleteFolder,
    handleUpdateNote,
    handleReorderNotes,
    handleDeleteNote,
    handleBatchDelete,
    handleSelectNote,
    handleToggleSelect,
    handleCloseTab,
    handleTabDragEnd,
    handlePinNote,
    handleOpenWindow,
    handleMoveNoteRequest,
    handleConfirmMoveNote,
    handleAddTagRequest,
    handleConfirmAddTag,
    setSearchQuery,
    setActiveNoteId,
    setOpenNoteIds,
    setUnsavedNoteIds,
    setIsFloatingOnTop,
    setSettings,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white dark:bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <NoteContext.Provider value={value}>
      {children}
    </NoteContext.Provider>
  );
};
