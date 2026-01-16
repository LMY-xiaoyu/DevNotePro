
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
// 导入组件
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
// 导入类型定义
import { Note, Settings, Toast, Folder } from './types';
// 导入图标
import { X, FileText, GripVertical, Plus, ArrowLeft, ArrowRight, MinusCircle, XCircle } from 'lucide-react';

// 本地存储键名
const LOCAL_STORAGE_KEY = 'devnote_pro_data_v1';
const SETTINGS_STORAGE_KEY = 'devnote_pro_settings_v1';
const FOLDERS_STORAGE_KEY = 'devnote_pro_folders_v1';

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
  // 提示信息列表
  const [toasts, setToasts] = useState<Toast[]>([]);
  // 浮动窗口是否置顶
  const [isFloatingOnTop, setIsFloatingOnTop] = useState(false);
  
  // 文件夹模态框状态
  const [folderModal, setFolderModal] = useState<{ isOpen: boolean; mode: 'create' | 'rename'; folderId?: string; initialValue?: string }>({ isOpen: false, mode: 'create' });
  // 移动笔记模态框状态
  const [moveNoteModal, setMoveNoteModal] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });
  // 标签选择模态框状态
  const [tagSelectModal, setTagSelectModal] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });
  // 标签页上下文菜单状态
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);

  // 确认对话框状态
  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; content: string; isDanger?: boolean; onConfirm: () => void }>({ isOpen: false, title: '', content: '', onConfirm: () => {} });

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

  /**
   * 获取Electron的ipcRenderer实例
   * @returns ipcRenderer实例或null
   */
  const getIpcRenderer = () => {
    if (typeof window !== 'undefined' && (window as any).require) {
      try { return (window as any).require('electron').ipcRenderer; } catch (e) { return null; }
    }
    return null;
  };

  /**
   * 添加提示信息
   * @param message 提示信息内容
   * @param type 提示信息类型
   */
  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  /**
   * 移除提示信息
   * @param id 提示信息ID
   */
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  /**
   * 显示确认对话框
   * @param title 对话框标题
   * @param content 对话框内容
   * @param onConfirm 确认回调函数
   * @param isDanger 是否为危险操作
   */
  const showConfirm = (title: string, content: string, onConfirm: () => void, isDanger: boolean = false) => {
    setConfirmation({ isOpen: true, title, content, onConfirm, isDanger });
  };

  /**
   * 保存笔记到磁盘
   * @param currentNotes 当前笔记列表
   * @param savedNoteId 要保存的笔记ID（可选）
   * @param silent 是否静默保存
   */
  const saveNotesToDisk = async (currentNotes: Note[], savedNoteId?: string, silent: boolean = false) => {
    const ipcRenderer = getIpcRenderer();
    let success = false;
    let errorMsg = '';
    
    // 如果有指定保存的笔记ID，使用editingNotes中的临时数据
    let noteToSave: Note | undefined;
    if (savedNoteId) {
      noteToSave = editingNotes.get(savedNoteId) || currentNotes.find(n => n.id === savedNoteId);
    }
    
    if (ipcRenderer) {
      if (savedNoteId && noteToSave) {
        const result = await ipcRenderer.invoke('save-note', noteToSave);
        if (result.success) success = true; else errorMsg = result.error;
      } else {
        // 如果是保存所有笔记，需要检查每个笔记是否有临时编辑数据
        const notesToSave = currentNotes.map(note => {
          const editingNote = editingNotes.get(note.id);
          return editingNote || note;
        });
        const result = await ipcRenderer.invoke('save-notes', notesToSave);
        if (result.success) success = true; else errorMsg = result.error;
      }
    } else {
      try {
        // 如果是保存所有笔记，需要检查每个笔记是否有临时编辑数据
        const notesToSave = currentNotes.map(note => {
          const editingNote = editingNotes.get(note.id);
          return editingNote || note;
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesToSave));
        success = true;
      } catch (e) { errorMsg = 'Local Storage Full'; }
    }
    
    if (success) {
      if (!silent) addToast('已保存', 'success');
      
      if (savedNoteId && noteToSave) {
        // 更新notes数组，使其包含最新的保存内容
        setNotes(prev => prev.map(n => n.id === savedNoteId ? noteToSave! : n));
        // 从editingNotes中移除已保存的笔记
        setEditingNotes(prev => {
          const newMap = new Map(prev);
          newMap.delete(savedNoteId);
          return newMap;
        });
        // 从unsavedNoteIds中移除已保存的笔记
        setUnsavedNoteIds(prev => { const next = new Set(prev); next.delete(savedNoteId); return next; });
      } else {
        // 如果是保存所有笔记，更新整个notes数组
        const updatedNotes = currentNotes.map(note => {
          const editingNote = editingNotes.get(note.id);
          return editingNote || note;
        });
        setNotes(updatedNotes);
        // 清空editingNotes
        setEditingNotes(new Map());
        // 清空unsavedNoteIds
        setUnsavedNoteIds(new Set());
      }
    }
    
    if (!success) addToast('保存失败: ' + errorMsg, 'warning');
  };

  /**
   * 保存文件夹到磁盘
   * @param folders 文件夹列表
   */
  const saveFoldersToDisk = async (folders: Folder[]) => {
    const ipcRenderer = getIpcRenderer();
    if (ipcRenderer) await ipcRenderer.invoke('save-folders', folders);
    else localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  };

  /**
   * 处理添加新笔记
   */
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

  // handleAddNote的引用，用于在useEffect中访问最新的函数
  const handleAddNoteRef = useRef(handleAddNote);
  useEffect(() => { handleAddNoteRef.current = handleAddNote; }, [handleAddNote]);

  /**
   * 初始化数据
   * 1. 从磁盘或本地存储加载笔记和文件夹
   * 2. 订阅IPC事件
   * 3. 设置初始状态
   */
  useEffect(() => {
    const initData = async () => {
      let loadedNotes: Note[] | null = null;
      let loadedFolders: Folder[] | null = null;
      const ipcRenderer = getIpcRenderer();
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

      if (ipcRenderer) {
        try {
          console.log('Invoking read-notes...');
          loadedNotes = await ipcRenderer.invoke('read-notes').catch((err: any) => {
            console.error('Failed to read notes via IPC:', err);
            return [];
          });
          console.log('Received notes from IPC:', loadedNotes ? loadedNotes.length : 'null');
          if (loadedNotes && loadedNotes.length > 0) {
            console.log('First note received:', loadedNotes[0]);
          }
          console.log('Invoking read-folders...');
          loadedFolders = await ipcRenderer.invoke('read-folders').catch((err: any) => {
            console.error('Failed to read folders via IPC:', err);
            return [];
          });
          console.log('Received folders from IPC:', loadedFolders ? loadedFolders.length : 'null');

          // 订阅笔记更新事件
          ipcRenderer.on('notes-updated', (_: any, updatedNotes: Note[]) => setNotes(updatedNotes));
          // 订阅单条笔记更新事件
          ipcRenderer.on('note-updated-single', (_: any, updatedNote: Note) => {
            setNotes(prev => {
              const exists = prev.find(n => n.id === updatedNote.id);
              return exists ? prev.map(n => n.id === updatedNote.id ? updatedNote : n) : [updatedNote, ...prev];
            });
          });
          // 订阅文件夹更新事件
          ipcRenderer.on('folders-updated', (_: any, updatedFolders: Folder[]) => setCustomFolders(updatedFolders));
          // 订阅设置更新事件
          ipcRenderer.on('settings-updated', (_: any, newSettings: Settings) => {
            if (JSON.stringify(newSettings) !== JSON.stringify(settingsRef.current)) setSettings(newSettings);
          });
          // 订阅新建笔记事件
          ipcRenderer.on('new-note', () => { if (!isFloatingWindow) handleAddNoteRef.current(); });
          // 订阅打开设置事件
          ipcRenderer.on('open-settings', () => { if (!isFloatingWindow) setShowSettings(true); });
        } catch (e) { console.error(e); }
      }

      // 从本地存储加载数据（如果IPC不可用或返回空数组）
      if (!loadedNotes || loadedNotes.length === 0) {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          try {
            const localNotes = JSON.parse(localData);
            if (localNotes && localNotes.length > 0) {
              loadedNotes = localNotes;
            }
          } catch (e) {
            console.error('Failed to parse local notes:', e);
          }
        }
      }
      if (!loadedFolders) {
        const localFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
        if (localFolders) loadedFolders = JSON.parse(localFolders);
      }

      // 清理空白笔记
      if (loadedNotes && loadedNotes.length > 0) {
        console.log('Cleaning up empty notes...');
        const initialCount = loadedNotes.length;
        const cleanedNotes = loadedNotes.filter(n => {
          // 检查笔记对象是否存在
          if (!n) {
            console.log('Found null/undefined note, removing...');
            return false;
          }
          // 检查title和content属性是否存在，避免trim()调用错误
          const titleIsBlank = !n.title || n.title.trim() === '';
          const contentIsBlank = !n.content || n.content.trim() === '';
          const tagsIsBlank = !n.tags || n.tags.length === 0;
          const isBlank = titleIsBlank && contentIsBlank && tagsIsBlank;
          if (isBlank) {
            // 如果使用IPC，从磁盘删除空白笔记
            if (ipcRenderer && n.id) ipcRenderer.invoke('delete-note', n.id);
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

      // 设置笔记状态
      if (loadedNotes) {
        console.log('Loaded notes from backend:', loadedNotes.length);
        console.log('First note:', loadedNotes[0]);
        setNotes(loadedNotes);
        // 重置editingNotes状态，确保它为空，这样当用户打开笔记时，会从notes状态中读取文件中持久化的内容
        setEditingNotes(new Map());
        if (loadedNotes.length > 0) {
          if (!isFloatingWindow) {
            // 在主窗口中，设置第一个笔记为激活状态
            const lastNote = loadedNotes[0];
            console.log('Setting active note:', lastNote.id);
            setActiveNoteId(lastNote.id);
            setOpenNoteIds([lastNote.id]);
          } else if (floatingNoteId) {
            // 在浮动窗口中，确保设置activeNoteId为floatingNoteId
            setActiveNoteId(floatingNoteId);
            // 检查loadedNotes中是否包含floatingNoteId对应的笔记
            const noteExists = loadedNotes.some(note => note.id === floatingNoteId);
            if (!noteExists) {
              // 如果不存在，尝试单独读取该笔记
              const ipcRenderer = getIpcRenderer();
              if (ipcRenderer) {
                ipcRenderer.invoke('read-note', floatingNoteId).then((note: Note | null) => {
                  if (note) {
                    setNotes(prev => [note, ...prev]);
                  } else {
                    // 如果读取失败，创建一个新的笔记
                    const newNote: Note = {
                      id: floatingNoteId,
                      title: '',
                      content: '',
                      tags: [],
                      folderId: 'all',
                      language: 'text',
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                      isArchived: false,
                      isPinned: false
                    };
                    setNotes(prev => [newNote, ...prev]);
                  }
                }).catch((err: any) => {
                  console.error('Failed to read note:', err);
                  // 错误处理，创建一个新的笔记
                  const newNote: Note = {
                    id: floatingNoteId,
                    title: '',
                    content: '',
                    tags: [],
                    folderId: 'all',
                    language: 'text',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    isArchived: false,
                    isPinned: false
                  };
                  setNotes(prev => [newNote, ...prev]);
                });
              }
            }
            // 如果是从主窗口拖拽过来的未保存笔记，确保设置未保存状态
            if (isUnsaved) {
              setUnsavedNoteIds(prev => {
                const next = new Set(prev);
                next.add(floatingNoteId);
                return next;
              });
            }
          }
        } else if (!isFloatingWindow) {
          // 如果没有笔记，创建欢迎笔记
          console.log('No notes found, creating welcome note');
          const welcome: Note = { id: 'welcome', title: '欢迎使用 DevNote Pro', content: `# 全新高性能架构\n\n- **独立文件存储**: 每个笔记现在保存为独立的 JSON 文件。\n- **图片支持**: 直接粘贴图片到编辑器。\n- **原生独立窗口**: 拖拽标签页向下，变为独立系统窗口。`, tags: ['版本更新'], folderId: 'all', language: 'markdown', createdAt: Date.now(), updatedAt: Date.now(), isArchived: false, isPinned: true };
          setNotes([welcome]);
          setActiveNoteId(welcome.id);
          setOpenNoteIds([welcome.id]);
        } else if (isFloatingWindow && floatingNoteId) {
          // 在浮动窗口中，如果没有笔记，创建一个新的笔记
          const newNote: Note = {
            id: floatingNoteId,
            title: '',
            content: '',
            tags: [],
            folderId: 'all',
            language: 'text',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isArchived: false,
            isPinned: false
          };
          setNotes([newNote]);
          setActiveNoteId(floatingNoteId);
        }
      } else if (isFloatingWindow && floatingNoteId) {
        // 如果loadedNotes为null，在浮动窗口中创建一个新的笔记
        const newNote: Note = {
          id: floatingNoteId,
          title: '',
          content: '',
          tags: [],
          folderId: 'all',
          language: 'text',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isArchived: false,
          isPinned: false
        };
        setNotes([newNote]);
        setActiveNoteId(floatingNoteId);
      }
      
      // 设置文件夹和设置状态
      if (loadedFolders) setCustomFolders(loadedFolders);
      if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    };
    
    initData();
  }, [isFloatingWindow, floatingNoteId]); // Run once on mount per window

  /**
   * 保存笔记到本地存储
   */
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes)); }, [notes]);

  /**
   * 保存设置到本地存储，并应用深色模式
   */
  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.darkMode);
    const ipc = getIpcRenderer();
    if (ipc) ipc.send('set-always-on-top', isFloatingWindow ? isFloatingOnTop : settings.alwaysOnTop);
  }, [settings, isFloatingWindow, isFloatingOnTop]);

  /**
   * 处理键盘快捷键
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const currentActiveNote = editingNotes.get(activeNoteId || '') || notes.find(n => n.id === activeNoteId) || null;
        if (currentActiveNote) {
          saveNotesToDisk(notes, currentActiveNote.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, activeNoteId, editingNotes]);

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
    else { const newSettings = { ...settings, alwaysOnTop: !settings.alwaysOnTop }; setSettings(newSettings); getIpcRenderer()?.send('broadcast-settings', newSettings); }
  };
  /**
   * 打开添加文件夹模态框
   */
  const openAddFolderModal = () => setFolderModal({ isOpen: true, mode: 'create', initialValue: '' });
  /**
   * 打开重命名文件夹模态框
   * @param id 文件夹ID
   */
  const openRenameFolderModal = (id: string) => { const f = customFolders.find(f => f.id === id); if (f) setFolderModal({ isOpen: true, mode: 'rename', folderId: id, initialValue: f.name }); };
  /**
   * 处理文件夹模态框确认
   * @param name 文件夹名称
   */
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
  /**
   * 处理删除文件夹
   * @param id 文件夹ID
   */
  const handleDeleteFolder = (id: string) => {
    showConfirm('删除文件夹', '确定删除此文件夹吗？其中的笔记将被移动到"全部笔记"。', () => {
      const updatedFolders = customFolders.filter(f => f.id !== id);
      setCustomFolders(updatedFolders); saveFoldersToDisk(updatedFolders);
      const updatedNotes = notes.map(n => n.folderId === id ? { ...n, folderId: 'all' } : n);
      setNotes(updatedNotes); saveNotesToDisk(updatedNotes, undefined, true);
      if (activeFolder === id) setActiveFolder('all'); addToast('文件夹已删除', 'info');
    }, true);
  };
  /**
   * 处理更新笔记
   * @param id 笔记ID
   * @param updates 更新内容
   */
  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    // 先从notes中找到原始笔记
    const originalNote = notes.find(n => n.id === id);
    if (originalNote) {
      // 从editingNotes中找到正在编辑的笔记，如果没有则使用原始笔记
      const currentEditingNote = editingNotes.get(id) || originalNote;
      // 更新临时编辑状态
      const updatedEditingNote = { ...currentEditingNote, ...updates };
      setEditingNotes(prev => {
        const newMap = new Map(prev);
        newMap.set(id, updatedEditingNote);
        return newMap;
      });
      // 添加到未保存集合
      setUnsavedNoteIds(prev => new Set(prev).add(id));
    }
  };
  /**
   * 处理重新排序笔记
   * @param draggedId 被拖拽的笔记ID
   * @param targetId 目标笔记ID
   */
  const handleReorderNotes = (draggedId: string, targetId: string) => {
    const dIdx = notes.findIndex(n => n.id === draggedId); const tIdx = notes.findIndex(n => n.id === targetId);
    if (dIdx === -1 || tIdx === -1 || dIdx === tIdx) return;
    const next = [...notes]; const [item] = next.splice(dIdx, 1); next.splice(tIdx, 0, item);
    setNotes(next); saveNotesToDisk(next, undefined, true);
  };
  /**
   * 处理删除笔记
   * @param id 笔记ID
   */
  const handleDeleteNote = (id: string) => {
    showConfirm('删除笔记', '确定要彻底删除这条笔记吗？', async () => {
      const updated = notes.filter(n => n.id !== id); setNotes(updated);
      handleCloseTab(id, undefined, true); addToast('笔记已删除', 'info');
      const ipc = getIpcRenderer(); if (ipc) await ipc.invoke('delete-note', id); else saveNotesToDisk(updated, undefined, true);
      if (isFloatingWindow && id === floatingNoteId) window.close();
    }, true);
  };
  /**
   * 处理批量删除笔记
   */
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
  /**
   * 处理选择笔记
   * @param id 笔记ID
   */
  const handleSelectNote = (id: string) => { if (!openNoteIds.includes(id)) setOpenNoteIds(prev => [...prev, id]); setActiveNoteId(id); };
  /**
   * 处理切换笔记选择状态
   * @param id 笔记ID
   */
  const handleToggleSelect = (id: string) => { setSelectedListIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  /**
   * 处理关闭标签页
   * @param id 笔记ID
   * @param e 鼠标事件
   * @param force 是否强制关闭
   */
  const handleCloseTab = (id: string, e?: React.MouseEvent, force: boolean = false) => {
    e?.stopPropagation();
    if (!force && unsavedNoteIds.has(id)) { showConfirm('关闭确认', '该笔记有未保存的更改，确定要关闭吗？', () => handleCloseTab(id, undefined, true), false); return; }
    const nextOpen = openNoteIds.filter(oid => oid !== id); setOpenNoteIds(nextOpen);
    setUnsavedNoteIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    // 从editingNotes中移除该笔记的临时数据，确保下次打开时显示的是文件中持久化的内容
    setEditingNotes(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    if (activeNoteId === id) setActiveNoteId(nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null);
  };
  /**
   * 处理关闭多个标签页
   * @param action 关闭操作类型
   */
  const handleCloseTabs = (action: 'others' | 'left' | 'right' | 'all') => {
    if (!tabContextMenu) return; const currentId = tabContextMenu.noteId; const currentIdx = openNoteIds.indexOf(currentId);
    let ids: string[] = [];
    switch (action) { case 'others': ids = openNoteIds.filter(id => id !== currentId); break; case 'left': ids = openNoteIds.slice(0, currentIdx); break; case 'right': ids = openNoteIds.slice(currentIdx + 1); break; case 'all': ids = [...openNoteIds]; break; }
    const unsaved = ids.filter(id => unsavedNoteIds.has(id));
    if (unsaved.length > 0) { showConfirm('关闭确认', `有 ${unsaved.length} 个未保存的标签，确定要全部关闭吗？`, () => { const next = openNoteIds.filter(id => !ids.includes(id)); setOpenNoteIds(next); if (action === 'all') setActiveNoteId(null); else if (!next.includes(activeNoteId || '')) setActiveNoteId(currentId); ids.forEach(id => setUnsavedNoteIds(prev => { const next = new Set(prev); next.delete(id); return next; })); setEditingNotes(prev => { const newMap = new Map(prev); ids.forEach(id => newMap.delete(id)); return newMap; }); }, false); return; }
    const next = openNoteIds.filter(id => !ids.includes(id)); setOpenNoteIds(next);
    if (action === 'all') setActiveNoteId(null); else if (!next.includes(activeNoteId || '')) setActiveNoteId(currentId);
    // 从editingNotes中移除关闭的标签页的临时数据
    ids.forEach(id => setUnsavedNoteIds(prev => { const next = new Set(prev); next.delete(id); return next; }));
    setEditingNotes(prev => {
      const newMap = new Map(prev);
      ids.forEach(id => newMap.delete(id));
      return newMap;
    });
  };
  /**
   * 处理标签页拖拽结束
   * @param e 拖拽事件
   * @param id 笔记ID
   */
  const handleTabDragEnd = (e: React.DragEvent, id: string) => { if (e.clientY > 150) { const ipc = getIpcRenderer(); if (ipc) { const note = editingNotes.get(id) || notes.find(n => n.id === id); if (note) { const isUnsaved = unsavedNoteIds.has(id); ipc.invoke('open-note-window', { ...note, isUnsaved }); handleCloseTab(id, undefined, true); } } } };
  /**
   * 处理置顶笔记
   * @param id 笔记ID
   */
  const handlePinNote = (id: string) => { const n = notes.find(n => n.id === id); if (n) { const updated = { ...n, isPinned: !n.isPinned }; const updatedNotes = notes.map(note => note.id === id ? updated : note); setNotes(updatedNotes); saveNotesToDisk(updatedNotes, id, true); } };
  /**
   * 处理打开笔记窗口
   * @param id 笔记ID
   */
  const handleOpenWindow = (id: string) => { const ipc = getIpcRenderer(); if (ipc) { const note = editingNotes.get(id) || notes.find(n => n.id === id); if (note) { const isUnsaved = unsavedNoteIds.has(id); ipc.invoke('open-note-window', { ...note, isUnsaved }); handleCloseTab(id, undefined, true); } } };
  /**
   * 处理移动笔记请求
   * @param id 笔记ID
   */
  const handleMoveNoteRequest = (id: string) => setMoveNoteModal({ isOpen: true, noteId: id });
  /**
   * 处理确认移动笔记
   * @param tid 目标文件夹ID
   */
  const handleConfirmMoveNote = (tid: string) => { if (moveNoteModal.noteId) { handleUpdateNote(moveNoteModal.noteId, { folderId: tid }); saveNotesToDisk(notes, moveNoteModal.noteId, true); addToast('笔记已移动', 'success'); } };
  /**
   * 处理添加标签请求
   * @param id 笔记ID
   */
  const handleAddTagRequest = (id: string) => setTagSelectModal({ isOpen: true, noteId: id });
  /**
   * 处理确认添加标签
   * @param tag 标签名称
   */
  const handleConfirmAddTag = (tag: string) => { if (tagSelectModal.noteId) { const n = notes.find(n => n.id === tagSelectModal.noteId); if (n && !n.tags.includes(tag)) { handleUpdateNote(tagSelectModal.noteId, { tags: [...n.tags, tag] }); addToast(`标签 "${tag}" 已添加`, 'success'); saveNotesToDisk(notes, tagSelectModal.noteId, true); } } };
  /**
   * 处理标签页上下文菜单
   * @param e 鼠标事件
   * @param noteId 笔记ID
   */
  const handleTabContextMenu = (e: React.MouseEvent, noteId: string) => { e.preventDefault(); setTabContextMenu({ x: e.clientX, y: e.clientY, noteId }); };
  /**
   * 获取标签页上下文菜单项
   * @returns 菜单项数组
   */
  const getTabContextMenuItems = (): MenuItem[] => [
    { label: '关闭其他标签', icon: <XCircle size={14} />, action: () => handleCloseTabs('others') },
    { label: '关闭左侧标签', icon: <ArrowLeft size={14} />, action: () => handleCloseTabs('left') },
    { label: '关闭右侧标签', icon: <ArrowRight size={14} />, action: () => handleCloseTabs('right') },
    { label: '关闭所有标签', icon: <MinusCircle size={14} />, action: () => handleCloseTabs('all'), danger: true },
  ];
  /**
   * 当前激活的笔记
   * 优先使用editingNotes中的临时数据，这样编辑器就能显示实时编辑的内容
   */
  const activeNote = editingNotes.get(activeNoteId || '') || notes.find(n => n.id === activeNoteId) || null;

  /**
   * 浮动窗口渲染逻辑
   */
  if (isFloatingWindow) {
    // 优先使用editingNotes中的临时数据，这样编辑器就能显示实时编辑的内容
    const editingNote = editingNotes.get(floatingNoteId || '');
    // 其次使用notes中的数据
    const noteFromNotes = notes.find(n => n.id === floatingNoteId);
    
    // 如果没有找到对应的笔记，尝试单独读取该笔记
    if (!editingNote && !noteFromNotes && floatingNoteId) {
      const ipcRenderer = getIpcRenderer();
      if (ipcRenderer) {
        ipcRenderer.invoke('read-note', floatingNoteId).then((note: Note | null) => {
          if (note) {
            setNotes(prev => {
              const exists = prev.some(n => n.id === note.id);
              return exists ? prev.map(n => n.id === note.id ? note : n) : [note, ...prev];
            });
          }
        }).catch((err: any) => {
          console.error('Failed to read note:', err);
        });
      }
    }
    
    // 为浮动窗口创建一个默认笔记对象，确保即使没有找到笔记也能显示编辑器
    const defaultNote: Note = {
      id: floatingNoteId || crypto.randomUUID(),
      title: '',
      content: '',
      tags: [],
      folderId: 'all',
      language: 'text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: false,
      isPinned: false
    };
    
    // 使用找到的笔记或默认笔记
    const finalNote = editingNote || noteFromNotes || defaultNote;
    
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
      <div className={`flex flex-col h-screen w-screen overflow-hidden ${settings.darkMode ? 'dark' : ''} bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800`}>
         <TitleBar title={`${finalNote.title || '独立窗口'}${unsavedNoteIds.has(finalNote.id) ? ' (未保存)' : ''}`} onMinimize={() => getIpcRenderer()?.send('window-minimize')} onClose={handleFloatingWindowClose} accentColor={settings.accentColor} />
         <Editor note={finalNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onSave={() => saveNotesToDisk(notes, finalNote.id)} onTogglePin={handlePinNote} viewState="floating" setViewState={handleFloatingWindowClose} accentColor={settings.accentColor} isWindowOnTop={isFloatingOnTop} onToggleWindowTop={handleToggleWindowTop} />
          <ToastContainer toasts={toasts} removeToast={removeToast} position="top-center" /><TooltipLayer />
          <ConfirmationModal isOpen={confirmation.isOpen} title={confirmation.title} content={confirmation.content} isDanger={confirmation.isDanger} onConfirm={confirmation.onConfirm} onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))} />
      </div>
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
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${settings.darkMode ? 'dark' : ''} bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-900 dark:to-zinc-800`}>
      <TitleBar title="开发者笔记 Pro (DevNote Pro)" onMinimize={() => getIpcRenderer()?.send('window-minimize')} onClose={() => getIpcRenderer()?.send('window-close')} accentColor={settings.accentColor} />
      <div className={`flex flex-1 overflow-hidden p-[0.3rem] gap-[0.3rem]`}>
        {/* 侧边栏卡片 */}
        <div className="w-64 rounded-lg shadow-md overflow-hidden bg-white dark:bg-zinc-900">
          <Sidebar activeFolder={activeFolder} setActiveFolder={handleNavigateFolder} activeTag={activeTag} setActiveTag={handleNavigateTag} tags={Array.from(new Set(notes.flatMap(n => n.tags)))} customFolders={customFolders} onAddFolder={openAddFolderModal} onRenameFolder={openRenameFolderModal} onDeleteFolder={handleDeleteFolder} onOpenSettings={() => setShowSettings(true)} />
        </div>
        
        {/* 笔记列表卡片 */}
        <div className="w-80 rounded-lg shadow-md overflow-hidden bg-white dark:bg-zinc-900">
          <NoteList notes={filteredNotes} selectedNoteId={activeNoteId} onSelectNote={handleSelectNote} selectedListIds={selectedListIds} onToggleSelect={handleToggleSelect} onBatchDelete={handleBatchDelete} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onPinNote={handlePinNote} onMoveNote={handleMoveNoteRequest} onOpenWindow={handleOpenWindow} onDeleteNote={handleDeleteNote} onReorderNotes={handleReorderNotes} onAddTag={handleAddTagRequest} />
        </div>
        
        {/* 编辑区域卡片 */}
        <div className="flex-1 rounded-lg shadow-md overflow-hidden bg-white dark:bg-zinc-900">
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
            <Editor note={activeNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onSave={() => saveNotesToDisk(notes, activeNote.id)} onTogglePin={handlePinNote} viewState="standard" setViewState={() => { if (activeNoteId) handleOpenWindow(activeNoteId); }} accentColor={settings.accentColor} isWindowOnTop={settings.alwaysOnTop} onToggleWindowTop={handleToggleWindowTop} />
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
