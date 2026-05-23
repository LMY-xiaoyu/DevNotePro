
/**
 * App.tsx - 应用的主组件
 * 
 * 功能：
 * 1. 管理应用的整体状态和布局
 * 2. 处理笔记的创建、编辑、删除等操作
 * 3. 处理文件夹和标签的管理
 * 4. 处理多窗口（浮动窗口）的逻辑
 * 5. 处理设置、提示信息等全局功能
 * 6. 处理键盘快捷键
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SettingsModal from './components/SettingsModal';
import ToastContainer from './components/ToastContainer';
import InputModal from './components/InputModal';
import FolderSelectModal from './components/FolderSelectModal';
import TagSelectModal from './components/TagSelectModal';
import ConfirmationModal from './components/ConfirmationModal';
import ContextMenu from './components/ContextMenu';
import { TooltipLayer } from './components/TooltipLayer';
// 导入类型定义
import { Note, Settings, Folder } from './types';
import { ipcClient } from './services/ipcClient';
import { LOCAL_STORAGE_KEY } from './constants/storage';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useConfirmation } from './hooks/useConfirmation';
import { useFolderActions } from './hooks/useFolderActions';
import { useFloatingNoteLoader } from './hooks/useFloatingNoteLoader';
import { useHorizontalWheel } from './hooks/useHorizontalWheel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNoteActions } from './hooks/useNoteActions';
import { useNotePersistence } from './hooks/useNotePersistence';
import { useSettingsSync } from './hooks/useSettingsSync';
import { useTabActions } from './hooks/useTabActions';
import { useToast } from './hooks/useToast';
import { createFallbackNote, createNote } from './utils/noteFactory';
import FloatingWorkspace from './views/FloatingWorkspace';
import MainWorkspace from './views/MainWorkspace';

/**
 * App组件 - 应用的主组件
 */
const App: React.FC = () => {
  // 解析URL参数，用于浮动窗口初始化
  const queryParams = new URLSearchParams(window.location.search);
  const floatingNoteId = queryParams.get('noteId');
  const isFloatingWindow = !!floatingNoteId;
  const isUnsaved = queryParams.get('isUnsaved') === 'true';

  // 状态管理
  // 笔记列表 - 只存储已保存到文件的内容
  const [notes, setNotes] = useState<Note[]>([]);
  // 标签页头部的ref，用于添加事件监听器
  const tabHeaderRef = useRef<HTMLDivElement>(null);
  // 正在编辑的笔记临时数据 - 存储实时编辑的内容
  const [editingNotes, setEditingNotes] = useState<Map<string, Note>>(new Map());
  // 自定义文件夹列表
  const [customFolders, setCustomFolders] = useState<Folder[]>([]);
  // 打开的标签页ID列表
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  // 当前激活的笔记ID
  const [activeNoteId, setActiveNoteId] = useState<string | null>(floatingNoteId || null);
  // 未保存的笔记ID集合
  const [unsavedNoteIds, setUnsavedNoteIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (isFloatingWindow && floatingNoteId && isUnsaved) {
      set.add(floatingNoteId);
    }
    return set;
  });
  // 当前激活的文件夹
  const [activeFolder, setActiveFolder] = useState<string>('all');
  // 当前激活的标签
  const [activeTag, setActiveTag] = useState<string | null>(null);
  // 选中的笔记ID集合（用于批量操作）
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());

  // 搜索查询
  const [searchQuery, setSearchQuery] = useState('');
  // 是否显示设置模态框
  const [showSettings, setShowSettings] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  // 浮动窗口是否置顶
  const [isFloatingOnTop, setIsFloatingOnTop] = useState(false);
  
  const { confirmation, showConfirm, closeConfirmation } = useConfirmation();

  // 应用设置
  const [settings, setSettings] = useState<Settings>({
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    accentColor: '#3b82f6',
    fontSize: 14,
    transparency: 100,
    floatingPosition: { x: 100, y: 100, width: 700, height: 500 },
    alwaysOnTop: false,
    minimizeToTray: true,
  });
  
  // settings的引用，用于在useEffect中访问最新的settings值
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const { saveNotesToDisk, saveFoldersToDisk } = useNotePersistence({
    notes,
    editingNotes,
    setNotes,
    setEditingNotes,
    setUnsavedNoteIds,
    addToast,
  });

  const {
    folderModal,
    openAddFolderModal,
    openRenameFolderModal,
    closeFolderModal,
    handleFolderModalConfirm,
    handleDeleteFolder,
  } = useFolderActions({
    customFolders,
    notes,
    activeFolder,
    setCustomFolders,
    setNotes,
    setActiveFolder,
    saveFoldersToDisk,
    saveNotesToDisk,
    addToast,
    showConfirm,
  });

  /**
   * 处理添加新笔记
   */
  const handleAddNote = useCallback(() => {
    const newNote = createNote(activeFolder === 'all' || activeFolder === 'archive' ? 'all' : activeFolder);
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

  // handleAddNote的引用，用于在useEffect中访问最新的函数
  const handleAddNoteRef = useRef(handleAddNote);
  useEffect(() => { handleAddNoteRef.current = handleAddNote; }, [handleAddNote]);
  const handleNewNoteFromExternalEvent = useCallback(() => handleAddNoteRef.current(), []);
  const handleOpenSettingsFromExternalEvent = useCallback(() => setShowSettings(true), []);

  useAppBootstrap({
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
    onNewNote: handleNewNoteFromExternalEvent,
    onOpenSettings: handleOpenSettingsFromExternalEvent,
  });

  /**
   * 保存笔记到本地存储
   */
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes)); }, [notes]);

  const saveSettings = useSettingsSync(settings, isFloatingWindow, isFloatingOnTop);

  // 暴露保存设置的函数给Settings组件
  const handleSaveSettings = useCallback(() => {
    saveSettings();
  }, [saveSettings]);

  useKeyboardShortcuts({
    onSave: () => {
      const currentActiveNote = editingNotes.get(activeNoteId || '') || notes.find(n => n.id === activeNoteId) || null;
      if (currentActiveNote) saveNotesToDisk(notes, currentActiveNote.id);
    },
    onNewNote: isFloatingWindow ? undefined : () => handleAddNoteRef.current(),
    onFocusSearch: isFloatingWindow ? undefined : () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[data-devnote-search="true"]');
      searchInput?.focus();
      searchInput?.select();
    },
  });

  const {
    tabContextMenu,
    setTabContextMenu,
    handleSelectNote,
    handleCloseTab,
    handleTabDragEnd,
    handleTabContextMenu,
    getTabContextMenuItems,
  } = useTabActions({
    notes,
    editingNotes,
    openNoteIds,
    activeNoteId,
    unsavedNoteIds,
    setOpenNoteIds,
    setActiveNoteId,
    setUnsavedNoteIds,
    setEditingNotes,
    showConfirm,
  });

  const {
    moveNoteModal,
    tagSelectModal,
    closeMoveNoteModal,
    closeTagSelectModal,
    handleUpdateNote,
    handleReorderNotes,
    handleDeleteNote,
    handleBatchDelete,
    handleToggleSelect,
    handlePinNote,
    handleOpenWindow,
    handleMoveNoteRequest,
    handleConfirmMoveNote,
    handleAddTagRequest,
    handleConfirmAddTag,
  } = useNoteActions({
    notes,
    editingNotes,
    unsavedNoteIds,
    selectedListIds,
    openNoteIds,
    activeNoteId,
    isFloatingWindow,
    floatingNoteId,
    setNotes,
    setEditingNotes,
    setUnsavedNoteIds,
    setSelectedListIds,
    setOpenNoteIds,
    setActiveNoteId,
    saveNotesToDisk,
    addToast,
    showConfirm,
    closeTab: handleCloseTab,
  });

  /**
   * 导航到文件夹
   * @param folderId 文件夹ID
   */
  const handleNavigateFolder = (folderId: string) => { setActiveFolder(folderId); setActiveTag(null); setSelectedListIds(new Set()); };
  /**
   * 导航到标签
   * @param tag 标签名称
   */
  const handleNavigateTag = (tag: string) => { setActiveTag(activeTag === tag ? null : tag); setSelectedListIds(new Set()); };
  /**
   * 切换窗口置顶状态
   */
  const handleToggleWindowTop = () => {
    if (isFloatingWindow) setIsFloatingOnTop(!isFloatingOnTop);
    else { const newSettings = { ...settings, alwaysOnTop: !settings.alwaysOnTop }; setSettings(newSettings); ipcClient.send('broadcast-settings', newSettings); }
  };
  /**
   * 当前激活的笔记
   * 优先使用editingNotes中的临时数据，这样编辑器就能显示实时编辑的内容
   */
  const activeNote = editingNotes.get(activeNoteId || '') || notes.find(n => n.id === activeNoteId) || null;
  const floatingEditingNote = editingNotes.get(floatingNoteId || '');
  const floatingNoteFromNotes = notes.find(n => n.id === floatingNoteId);

  useHorizontalWheel(tabHeaderRef, !isFloatingWindow, [openNoteIds.length]);
  useFloatingNoteLoader({
    enabled: isFloatingWindow,
    noteId: floatingNoteId,
    hasLocalNote: !!floatingEditingNote || !!floatingNoteFromNotes,
    setNotes,
  });

  /**
   * 浮动窗口渲染逻辑
   */
  if (isFloatingWindow) {
    // 为浮动窗口创建一个默认笔记对象，确保即使没有找到笔记也能显示编辑器
    const defaultNote = createFallbackNote(floatingNoteId || crypto.randomUUID());
    
    // 使用找到的笔记或默认笔记
    const finalNote = floatingEditingNote || floatingNoteFromNotes || defaultNote;
    
    // 处理浮动窗口关闭
    const handleFloatingWindowClose = () => {
      if (unsavedNoteIds.has(finalNote.id)) {
        showConfirm('关闭确认', '该笔记有未保存的更改，确定要关闭吗？', () => {
          window.close();
        }, false);
      } else {
        window.close();
      }
    };
    
    return (
      <>
        <FloatingWorkspace
          note={finalNote}
          settings={settings}
          isUnsaved={unsavedNoteIds.has(finalNote.id)}
          isWindowOnTop={isFloatingOnTop}
          onMinimize={() => ipcClient.send('window-minimize')}
          onClose={handleFloatingWindowClose}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onSave={() => saveNotesToDisk(notes, finalNote.id)}
          onTogglePin={handlePinNote}
          onToggleWindowTop={handleToggleWindowTop}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} position="top-center" />
        <TooltipLayer />
        <ConfirmationModal isOpen={confirmation.isOpen} title={confirmation.title} content={confirmation.content} isDanger={confirmation.isDanger} onConfirm={confirmation.onConfirm} onClose={closeConfirmation} />
      </>
    );
  }

  /**
   * 过滤后的笔记列表
   */
  const filteredNotes = notes.filter(n => {
    if (activeTag) return n.tags.includes(activeTag) && !n.isArchived;
    if (activeFolder === 'all') return !n.isArchived;
    if (activeFolder === 'archive') return n.isArchived;
    return n.folderId === activeFolder && !n.isArchived;
  });

  return (
    <>
      <MainWorkspace
        notes={notes}
        filteredNotes={filteredNotes}
        customFolders={customFolders}
        tags={Array.from(new Set(notes.flatMap(n => n.tags)))}
        activeNote={activeNote}
        activeNoteId={activeNoteId}
        activeFolder={activeFolder}
        activeTag={activeTag}
        openNoteIds={openNoteIds}
        unsavedNoteIds={unsavedNoteIds}
        selectedListIds={selectedListIds}
        searchQuery={searchQuery}
        settings={settings}
        tabHeaderRef={tabHeaderRef}
        onMinimize={() => ipcClient.send('window-minimize')}
        onClose={() => ipcClient.send('window-close')}
        onAddNote={handleAddNote}
        onOpenSettings={() => setShowSettings(true)}
        onNavigateFolder={handleNavigateFolder}
        onNavigateTag={handleNavigateTag}
        onAddFolder={openAddFolderModal}
        onRenameFolder={openRenameFolderModal}
        onDeleteFolder={handleDeleteFolder}
        onSelectNote={handleSelectNote}
        onToggleSelect={handleToggleSelect}
        onBatchDelete={handleBatchDelete}
        onSearchQueryChange={setSearchQuery}
        onPinNote={handlePinNote}
        onMoveNote={handleMoveNoteRequest}
        onOpenWindow={handleOpenWindow}
        onDeleteNote={handleDeleteNote}
        onReorderNotes={handleReorderNotes}
        onAddTag={handleAddTagRequest}
        onUpdateNote={handleUpdateNote}
        onSaveActiveNote={() => { if (activeNote) saveNotesToDisk(notes, activeNote.id); }}
        onToggleWindowTop={handleToggleWindowTop}
        onTabContextMenu={handleTabContextMenu}
        onTabDragEnd={handleTabDragEnd}
        onCloseTab={handleCloseTab}
      />
      <ToastContainer toasts={toasts} removeToast={removeToast} /><TooltipLayer />
      {showSettings && <SettingsModal settings={settings} onUpdateSettings={(u) => { const next = { ...settings, ...u }; setSettings(next); ipcClient.send('broadcast-settings', next); }} onSaveSettings={handleSaveSettings} onClose={() => setShowSettings(false)} />}
      <InputModal isOpen={folderModal.isOpen} title={folderModal.mode === 'create' ? '新建文件夹' : '重命名文件夹'} placeholder="文件夹名称..." initialValue={folderModal.initialValue} onConfirm={handleFolderModalConfirm} onClose={closeFolderModal} />
      <FolderSelectModal isOpen={moveNoteModal.isOpen} customFolders={customFolders} onSelect={handleConfirmMoveNote} onClose={closeMoveNoteModal} />
      <TagSelectModal isOpen={tagSelectModal.isOpen} tags={Array.from(new Set(notes.flatMap(n => n.tags)))} onSelect={handleConfirmAddTag} onClose={closeTagSelectModal} />
      <ConfirmationModal isOpen={confirmation.isOpen} title={confirmation.title} content={confirmation.content} isDanger={confirmation.isDanger} onConfirm={confirmation.onConfirm} onClose={closeConfirmation} />
      {tabContextMenu && <ContextMenu x={tabContextMenu.x} y={tabContextMenu.y} items={getTabContextMenuItems()} onClose={() => setTabContextMenu(null)} />}
    </>
  );
};

export default App;
