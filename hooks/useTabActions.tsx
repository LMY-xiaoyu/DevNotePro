import React, { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, MinusCircle, XCircle } from 'lucide-react';
import { MenuItem } from '../components/ContextMenu';
import { Note } from '../types';
import { ipcClient } from '../services/ipcClient';

interface TabActionsOptions {
  notes: Note[];
  editingNotes: Map<string, Note>;
  openNoteIds: string[];
  activeNoteId: string | null;
  unsavedNoteIds: Set<string>;
  setOpenNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  setUnsavedNoteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEditingNotes: React.Dispatch<React.SetStateAction<Map<string, Note>>>;
  showConfirm: (title: string, content: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const useTabActions = ({
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
}: TabActionsOptions) => {
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);

  const handleSelectNote = useCallback((id: string) => {
    if (!openNoteIds.includes(id)) setOpenNoteIds(prev => [...prev, id]);
    setActiveNoteId(id);
  }, [openNoteIds, setActiveNoteId, setOpenNoteIds]);

  const discardTabState = useCallback((ids: string[]) => {
    setUnsavedNoteIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    setEditingNotes(prev => {
      const next = new Map(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, [setEditingNotes, setUnsavedNoteIds]);

  const handleCloseTab = useCallback((id: string, e?: React.MouseEvent, force = false) => {
    e?.stopPropagation();
    if (!force && unsavedNoteIds.has(id)) {
      showConfirm('关闭确认', '该笔记有未保存的更改，确定要关闭吗？', () => handleCloseTab(id, undefined, true), false);
      return;
    }

    const nextOpen = openNoteIds.filter(openId => openId !== id);
    setOpenNoteIds(nextOpen);
    discardTabState([id]);
    if (activeNoteId === id) setActiveNoteId(nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null);
  }, [activeNoteId, discardTabState, openNoteIds, setActiveNoteId, setOpenNoteIds, showConfirm, unsavedNoteIds]);

  const handleCloseTabs = useCallback((action: 'others' | 'left' | 'right' | 'all') => {
    if (!tabContextMenu) return;

    const currentId = tabContextMenu.noteId;
    const currentIdx = openNoteIds.indexOf(currentId);
    let ids: string[] = [];

    switch (action) {
      case 'others':
        ids = openNoteIds.filter(id => id !== currentId);
        break;
      case 'left':
        ids = openNoteIds.slice(0, currentIdx);
        break;
      case 'right':
        ids = openNoteIds.slice(currentIdx + 1);
        break;
      case 'all':
        ids = [...openNoteIds];
        break;
    }

    const closeSelectedTabs = () => {
      const next = openNoteIds.filter(id => !ids.includes(id));
      setOpenNoteIds(next);
      if (action === 'all') setActiveNoteId(null);
      else if (!next.includes(activeNoteId || '')) setActiveNoteId(currentId);
      discardTabState(ids);
    };

    const unsaved = ids.filter(id => unsavedNoteIds.has(id));
    if (unsaved.length > 0) {
      showConfirm('关闭确认', `有 ${unsaved.length} 个未保存的标签，确定要全部关闭吗？`, closeSelectedTabs, false);
      return;
    }

    closeSelectedTabs();
  }, [activeNoteId, discardTabState, openNoteIds, setActiveNoteId, setOpenNoteIds, showConfirm, tabContextMenu, unsavedNoteIds]);

  const handleTabDragEnd = useCallback((e: React.DragEvent, id: string) => {
    if (e.clientY <= 150 || !ipcClient.isAvailable()) return;

    const note = editingNotes.get(id) || notes.find(n => n.id === id);
    if (!note) return;

    ipcClient.openNoteWindow({ ...note, isUnsaved: unsavedNoteIds.has(id) });
    handleCloseTab(id, undefined, true);
  }, [editingNotes, handleCloseTab, notes, unsavedNoteIds]);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    setTabContextMenu({ x: e.clientX, y: e.clientY, noteId });
  }, []);

  const getTabContextMenuItems = useCallback((): MenuItem[] => [
    { label: '关闭其他标签', icon: <XCircle size={14} />, action: () => handleCloseTabs('others') },
    { label: '关闭左侧标签', icon: <ArrowLeft size={14} />, action: () => handleCloseTabs('left') },
    { label: '关闭右侧标签', icon: <ArrowRight size={14} />, action: () => handleCloseTabs('right') },
    { label: '关闭所有标签', icon: <MinusCircle size={14} />, action: () => handleCloseTabs('all'), danger: true },
  ], [handleCloseTabs]);

  return {
    tabContextMenu,
    setTabContextMenu,
    handleSelectNote,
    handleCloseTab,
    handleTabDragEnd,
    handleTabContextMenu,
    getTabContextMenuItems,
  };
};
