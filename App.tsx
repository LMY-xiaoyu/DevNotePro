
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import SettingsModal from './components/SettingsModal';
import ToastContainer from './components/ToastContainer';
import TitleBar from './components/TitleBar';
import InputModal from './components/InputModal';
import FolderSelectModal from './components/FolderSelectModal';
import TagSelectModal from './components/TagSelectModal';
import ConfirmationModal from './components/ConfirmationModal';
import ContextMenu, { MenuItem } from './components/ContextMenu';
import { TooltipLayer } from './components/TooltipLayer';
import { Note, Settings, Toast, Folder } from './types';
import { X, FileText, GripVertical, Loader2, Plus, ArrowLeft, ArrowRight, MinusCircle, XCircle } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'devnote_pro_data_v1';
const SETTINGS_STORAGE_KEY = 'devnote_pro_settings_v1';
const FOLDERS_STORAGE_KEY = 'devnote_pro_folders_v1';

const App: React.FC = () => {
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
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFloatingOnTop, setIsFloatingOnTop] = useState(false);
  
  const [folderModal, setFolderModal] = useState<{ isOpen: boolean; mode: 'create' | 'rename'; folderId?: string; initialValue?: string }>({ isOpen: false, mode: 'create' });
  const [moveNoteModal, setMoveNoteModal] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });
  const [tagSelectModal, setTagSelectModal] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);

  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; content: string; isDanger?: boolean; onConfirm: () => void }>({ isOpen: false, title: '', content: '', onConfirm: () => {} });

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

  const showConfirm = (title: string, content: string, onConfirm: () => void, isDanger: boolean = false) => {
    setConfirmation({ isOpen: true, title, content, onConfirm, isDanger });
  };

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
          ipcRenderer.on('folders-updated', (_: any, updatedFolders: Folder[]) => setCustomFolders(updatedFolders));
          ipcRenderer.on('settings-updated', (_: any, newSettings: Settings) => {
            if (JSON.stringify(newSettings) !== JSON.stringify(settingsRef.current)) setSettings(newSettings);
          });
          ipcRenderer.on('new-note', () => { if (!isFloatingWindow) handleAddNoteRef.current(); });
          ipcRenderer.on('open-settings', () => { if (!isFloatingWindow) setShowSettings(true); });
        } catch (e) { console.error(e); }
      }

      if (!loadedNotes) {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) loadedNotes = JSON.parse(localData);
      }
      if (!loadedFolders) {
        const localFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
        if (localFolders) loadedFolders = JSON.parse(localFolders);
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
      if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    };
    initData();
  }, [isFloatingWindow]); // Run once on mount per window

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
  const openAddFolderModal = () => setFolderModal({ isOpen: true, mode: 'create', initialValue: '' });
  const openRenameFolderModal = (id: string) => { const f = customFolders.find(f => f.id === id); if (f) setFolderModal({ isOpen: true, mode: 'rename', folderId: id, initialValue: f.name }); };
  const handleFolderModalConfirm = (name: string) => {
    if (folderModal.mode === 'create') {
      const newFolder: Folder = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), name };
      const updated = [...customFolders, newFolder];
      setCustomFolders(updated); saveFoldersToDisk(updated); addToast(`文件夹 "${name}" 已创建`, 'success');
    } else if (folderModal.mode === 'rename' && folderModal.folderId) {
      const updated = customFolders.map(f => f.id === folderModal.folderId ? { ...f, name } : f);
      setCustomFolders(updated); saveFoldersToDisk(updated); addToast(`已重命名为 "${name}"`, 'success');
    }
  };
  const handleDeleteFolder = (id: string) => {
    showConfirm('删除文件夹', '确定删除此文件夹吗？其中的笔记将被移动到"全部笔记"。', () => {
      const updatedFolders = customFolders.filter(f => f.id !== id);
      setCustomFolders(updatedFolders); saveFoldersToDisk(updatedFolders);
      const updatedNotes = notes.map(n => n.folderId === id ? { ...n, folderId: 'all' } : n);
      setNotes(updatedNotes); saveNotesToDisk(updatedNotes, undefined, true);
      if (activeFolder === id) setActiveFolder('all'); addToast('文件夹已删除', 'info');
    }, true);
  };
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
    showConfirm('删除笔记', '确定要彻底删除这条笔记吗？', async () => {
      const updated = notes.filter(n => n.id !== id); setNotes(updated);
      handleCloseTab(id, undefined, true); addToast('笔记已删除', 'info');
      const ipc = getIpcRenderer(); if (ipc) await ipc.invoke('delete-note', id); else saveNotesToDisk(updated, undefined, true);
      if (isFloatingWindow && id === floatingNoteId) window.close();
    }, true);
  };
  const handleBatchDelete = () => {
    if (selectedListIds.size === 0) return;
    showConfirm('批量删除', `确定要删除选中的 ${selectedListIds.size} 条笔记吗？`, async () => {
      const updated = notes.filter(n => !selectedListIds.has(n.id)); setNotes(updated);
      const nextOpen = openNoteIds.filter(id => !selectedListIds.has(id)); setOpenNoteIds(nextOpen);
      if (activeNoteId && selectedListIds.has(activeNoteId)) setActiveNoteId(nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null);
      const ipc = getIpcRenderer();
      if (ipc) { for (const id of selectedListIds) await ipc.invoke('delete-note', id); } else saveNotesToDisk(updated, undefined, true);
      setSelectedListIds(new Set()); addToast(`${selectedListIds.size} 条笔记已删除`, 'info');
    }, true);
  };
  const handleSelectNote = (id: string) => { if (!openNoteIds.includes(id)) setOpenNoteIds(prev => [...prev, id]); setActiveNoteId(id); };
  const handleToggleSelect = (id: string) => { setSelectedListIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const handleCloseTab = (id: string, e?: React.MouseEvent, force: boolean = false) => {
    e?.stopPropagation();
    if (!force && unsavedNoteIds.has(id)) { showConfirm('关闭确认', '该笔记有未保存的更改，确定要关闭吗？', () => handleCloseTab(id, undefined, true), false); return; }
    const nextOpen = openNoteIds.filter(oid => oid !== id); setOpenNoteIds(nextOpen);
    setUnsavedNoteIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (activeNoteId === id) setActiveNoteId(nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null);
  };
  const handleCloseTabs = (action: 'others' | 'left' | 'right' | 'all') => {
    if (!tabContextMenu) return; const currentId = tabContextMenu.noteId; const currentIdx = openNoteIds.indexOf(currentId);
    let ids: string[] = [];
    switch (action) { case 'others': ids = openNoteIds.filter(id => id !== currentId); break; case 'left': ids = openNoteIds.slice(0, currentIdx); break; case 'right': ids = openNoteIds.slice(currentIdx + 1); break; case 'all': ids = [...openNoteIds]; break; }
    const unsaved = ids.filter(id => unsavedNoteIds.has(id));
    if (unsaved.length > 0) { showConfirm('关闭确认', `有 ${unsaved.length} 个未保存的标签，确定要全部关闭吗？`, () => { const next = openNoteIds.filter(id => !ids.includes(id)); setOpenNoteIds(next); if (action === 'all') setActiveNoteId(null); else if (!next.includes(activeNoteId || '')) setActiveNoteId(currentId); }, false); return; }
    const next = openNoteIds.filter(id => !ids.includes(id)); setOpenNoteIds(next);
    if (action === 'all') setActiveNoteId(null); else if (!next.includes(activeNoteId || '')) setActiveNoteId(currentId);
  };
  const handleTabDragEnd = (e: React.DragEvent, id: string) => { if (e.clientY > 150) { const ipc = getIpcRenderer(); if (ipc) { ipc.invoke('open-note-window', id); handleCloseTab(id, undefined, true); } } };
  const handlePinNote = (id: string) => { const n = notes.find(n => n.id === id); if (n) { const updated = { ...n, isPinned: !n.isPinned }; handleUpdateNote(id, { isPinned: !n.isPinned }); saveNotesToDisk(notes.map(note => note.id === id ? updated : note), id, true); } };
  const handleOpenWindow = (id: string) => { const ipc = getIpcRenderer(); if (ipc) { ipc.invoke('open-note-window', id); handleCloseTab(id, undefined, true); } };
  const handleMoveNoteRequest = (id: string) => setMoveNoteModal({ isOpen: true, noteId: id });
  const handleConfirmMoveNote = (tid: string) => { if (moveNoteModal.noteId) { handleUpdateNote(moveNoteModal.noteId, { folderId: tid }); saveNotesToDisk(notes, moveNoteModal.noteId, true); addToast('笔记已移动', 'success'); } };
  const handleAddTagRequest = (id: string) => setTagSelectModal({ isOpen: true, noteId: id });
  const handleConfirmAddTag = (tag: string) => { if (tagSelectModal.noteId) { const n = notes.find(n => n.id === tagSelectModal.noteId); if (n && !n.tags.includes(tag)) { handleUpdateNote(tagSelectModal.noteId, { tags: [...n.tags, tag] }); addToast(`标签 "${tag}" 已添加`, 'success'); saveNotesToDisk(notes, tagSelectModal.noteId, true); } } };
  const handleTabContextMenu = (e: React.MouseEvent, noteId: string) => { e.preventDefault(); setTabContextMenu({ x: e.clientX, y: e.clientY, noteId }); };
  const getTabContextMenuItems = (): MenuItem[] => [
    { label: '关闭其他标签', icon: <XCircle size={14} />, action: () => handleCloseTabs('others') },
    { label: '关闭左侧标签', icon: <ArrowLeft size={14} />, action: () => handleCloseTabs('left') },
    { label: '关闭右侧标签', icon: <ArrowRight size={14} />, action: () => handleCloseTabs('right') },
    { label: '关闭所有标签', icon: <MinusCircle size={14} />, action: () => handleCloseTabs('all'), danger: true },
  ];
  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  if (isFloatingWindow) {
    if (!activeNote) return (
      <div className={`flex flex-col h-screen w-screen overflow-hidden ${settings.darkMode ? 'dark' : ''} bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800`}>
         <TitleBar title="加载中..." onMinimize={() => getIpcRenderer()?.send('window-minimize')} onClose={() => window.close()} accentColor={settings.accentColor} />
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Loader2 className="animate-spin" size={24} /><span className="text-xs">正在同步数据...</span>
          </div>
      </div>
    );
    return (
      <div className={`flex flex-col h-screen w-screen overflow-hidden ${settings.darkMode ? 'dark' : ''} bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800`}>
         <TitleBar title={`${activeNote.title || '独立窗口'}${unsavedNoteIds.has(activeNote.id) ? ' (未保存)' : ''}`} onMinimize={() => getIpcRenderer()?.send('window-minimize')} onClose={() => window.close()} accentColor={settings.accentColor} />
         <Editor note={activeNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onSave={() => saveNotesToDisk(notes, activeNote.id)} viewState="floating" setViewState={() => window.close()} accentColor={settings.accentColor} isWindowOnTop={isFloatingOnTop} onToggleWindowTop={handleToggleWindowTop} />
          <ToastContainer toasts={toasts} removeToast={removeToast} position="top-center" /><TooltipLayer />
          <ConfirmationModal isOpen={confirmation.isOpen} title={confirmation.title} content={confirmation.content} isDanger={confirmation.isDanger} onConfirm={confirmation.onConfirm} onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))} />
      </div>
    );
  }

  const filteredNotes = notes.filter(n => {
    if (activeTag) return n.tags.includes(activeTag) && !n.isArchived;
    if (activeFolder === 'all') return !n.isArchived;
    if (activeFolder === 'archive') return n.isArchived;
    return n.folderId === activeFolder && !n.isArchived;
  });

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${settings.darkMode ? 'dark' : ''} bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800`}>
      <TitleBar title="开发者笔记 Pro (DevNote Pro)" onMinimize={() => getIpcRenderer()?.send('window-minimize')} onClose={() => getIpcRenderer()?.send('window-close')} accentColor={settings.accentColor} />
      <div className={`flex flex-1 overflow-hidden`}>
        <Sidebar activeFolder={activeFolder} setActiveFolder={handleNavigateFolder} activeTag={activeTag} setActiveTag={handleNavigateTag} tags={Array.from(new Set(notes.flatMap(n => n.tags)))} customFolders={customFolders} onAddFolder={openAddFolderModal} onRenameFolder={openRenameFolderModal} onDeleteFolder={handleDeleteFolder} onOpenSettings={() => setShowSettings(true)} />
        <NoteList notes={filteredNotes} selectedNoteId={activeNoteId} onSelectNote={handleSelectNote} selectedListIds={selectedListIds} onToggleSelect={handleToggleSelect} onBatchDelete={handleBatchDelete} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onPinNote={handlePinNote} onMoveNote={handleMoveNoteRequest} onOpenWindow={handleOpenWindow} onDeleteNote={handleDeleteNote} onReorderNotes={handleReorderNotes} onAddTag={handleAddTagRequest} />
        <div className="flex-1 relative flex flex-col bg-white dark:bg-zinc-950 min-w-0">
          {openNoteIds.length > 0 && (
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
              {openNoteIds.map(id => {
                const note = notes.find(n => n.id === id); if (!note) return null;
                const isActive = activeNoteId === id; const isUnsaved = unsavedNoteIds.has(id);
                return (
                  <div key={id} onClick={() => handleSelectNote(id)} onContextMenu={(e) => handleTabContextMenu(e, id)} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', id)} onDragEnd={(e) => handleTabDragEnd(e, id)} className={`group relative flex items-center gap-2 px-4 py-2.5 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-zinc-200 dark:border-zinc-800 select-none transition-colors ${isActive ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}>
                    {isActive && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: settings.accentColor }} />}
                    <div className="opacity-0 group-hover:opacity-20 cursor-grab active:cursor-grabbing"><GripVertical size={10} /></div>
                    <FileText size={12} className={isActive ? 'opacity-100' : 'opacity-50'} /><span className="truncate flex-1">{note.title || '无标题'}</span>
                    {isUnsaved && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="未保存" />}
                    <button onClick={(e) => handleCloseTab(id, e)} className={`p-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 ${isActive || isUnsaved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}><X size={12} /></button>
                  </div>
                );
              })}
            </div>
          )}
          {activeNote ? (
            <Editor note={activeNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onSave={() => saveNotesToDisk(notes, activeNote.id)} viewState="standard" setViewState={() => { if (activeNoteId) handleOpenWindow(activeNoteId); }} accentColor={settings.accentColor} isWindowOnTop={settings.alwaysOnTop} onToggleWindowTop={handleToggleWindowTop} />
          ) : ( <div className="flex-1 flex items-center justify-center text-zinc-300 dark:text-zinc-700 font-bold"><p className="text-sm">选择或创建笔记</p></div> )}
        </div>
        <button onClick={handleAddNote} style={{ backgroundColor: settings.accentColor }} className="fixed bottom-12 right-12 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-10 no-drag" data-tooltip="新建笔记 (Ctrl + N)"><Plus size={24} /></button>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} /><TooltipLayer />
      {showSettings && <SettingsModal settings={settings} onUpdateSettings={(u) => { const next = { ...settings, ...u }; setSettings(next); getIpcRenderer()?.send('broadcast-settings', next); }} onClose={() => setShowSettings(false)} />}
      <InputModal isOpen={folderModal.isOpen} title={folderModal.mode === 'create' ? '新建文件夹' : '重命名文件夹'} placeholder="文件夹名称..." initialValue={folderModal.initialValue} onConfirm={handleFolderModalConfirm} onClose={() => setFolderModal({ ...folderModal, isOpen: false })} />
      <FolderSelectModal isOpen={moveNoteModal.isOpen} customFolders={customFolders} onSelect={handleConfirmMoveNote} onClose={() => setMoveNoteModal({ ...moveNoteModal, isOpen: false })} />
      <TagSelectModal isOpen={tagSelectModal.isOpen} tags={Array.from(new Set(notes.flatMap(n => n.tags)))} onSelect={handleConfirmAddTag} onClose={() => setTagSelectModal({ ...tagSelectModal, isOpen: false })} />
      <ConfirmationModal isOpen={confirmation.isOpen} title={confirmation.title} content={confirmation.content} isDanger={confirmation.isDanger} onConfirm={confirmation.onConfirm} onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))} />
      {tabContextMenu && <ContextMenu x={tabContextMenu.x} y={tabContextMenu.y} items={getTabContextMenuItems()} onClose={() => setTabContextMenu(null)} />}
    </div>
  );
};

export default App;
