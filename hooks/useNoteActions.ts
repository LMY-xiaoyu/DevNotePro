import { Dispatch, MouseEvent, SetStateAction, useCallback, useState } from 'react';
import { Note, Toast } from '../types';
import { ipcClient } from '../services/ipcClient';

interface NoteActionsOptions {
  notes: Note[];
  editingNotes: Map<string, Note>;
  unsavedNoteIds: Set<string>;
  selectedListIds: Set<string>;
  openNoteIds: string[];
  activeNoteId: string | null;
  isFloatingWindow: boolean;
  floatingNoteId: string | null;
  setNotes: Dispatch<SetStateAction<Note[]>>;
  setEditingNotes: Dispatch<SetStateAction<Map<string, Note>>>;
  setUnsavedNoteIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectedListIds: Dispatch<SetStateAction<Set<string>>>;
  setOpenNoteIds: Dispatch<SetStateAction<string[]>>;
  setActiveNoteId: Dispatch<SetStateAction<string | null>>;
  saveNotesToDisk: (notes: Note[], savedNoteId?: string, silent?: boolean) => Promise<void>;
  addToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (title: string, content: string, onConfirm: () => void, isDanger?: boolean) => void;
  closeTab: (id: string, e?: MouseEvent, force?: boolean) => void;
}

export const useNoteActions = ({
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
  closeTab,
}: NoteActionsOptions) => {
  const [moveNoteModal, setMoveNoteModal] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });
  const [tagSelectModal, setTagSelectModal] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });

  const handleUpdateNote = useCallback((id: string, updates: Partial<Note>) => {
    const originalNote = notes.find(n => n.id === id);
    if (!originalNote) return;

    const currentEditingNote = editingNotes.get(id) || originalNote;
    const updatedEditingNote = { ...currentEditingNote, ...updates };

    setEditingNotes(prev => {
      const next = new Map(prev);
      next.set(id, updatedEditingNote);
      return next;
    });
    setUnsavedNoteIds(prev => new Set(prev).add(id));
  }, [editingNotes, notes, setEditingNotes, setUnsavedNoteIds]);

  const commitNoteUpdate = useCallback((id: string, updates: Partial<Note>, silent = true) => {
    const baseNote = editingNotes.get(id) || notes.find(n => n.id === id);
    if (!baseNote) return null;

    const updatedNote: Note = {
      ...baseNote,
      ...updates,
      updatedAt: updates.updatedAt ?? Date.now(),
    };
    const updatedNotes = notes.some(n => n.id === id)
      ? notes.map(n => n.id === id ? updatedNote : n)
      : [updatedNote, ...notes];

    setNotes(updatedNotes);
    setEditingNotes(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setUnsavedNoteIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    saveNotesToDisk(updatedNotes, id, silent);
    return updatedNote;
  }, [editingNotes, notes, saveNotesToDisk, setEditingNotes, setNotes, setUnsavedNoteIds]);

  const handleReorderNotes = useCallback((draggedId: string, targetId: string) => {
    const draggedIndex = notes.findIndex(n => n.id === draggedId);
    const targetIndex = notes.findIndex(n => n.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const next = [...notes];
    const [item] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, item);
    setNotes(next);
    saveNotesToDisk(next, undefined, true);
  }, [notes, saveNotesToDisk, setNotes]);

  const handleDeleteNote = useCallback((id: string) => {
    showConfirm('删除笔记', '确定要彻底删除这条笔记吗？', async () => {
      const updated = notes.filter(n => n.id !== id);
      setNotes(updated);
      closeTab(id, undefined, true);
      addToast('笔记已删除', 'info');
      if (ipcClient.isAvailable()) await ipcClient.deleteNote(id);
      else saveNotesToDisk(updated, undefined, true);
      if (isFloatingWindow && id === floatingNoteId) window.close();
    }, true);
  }, [addToast, closeTab, floatingNoteId, isFloatingWindow, notes, saveNotesToDisk, setNotes, showConfirm]);

  const handleBatchDelete = useCallback(() => {
    if (selectedListIds.size === 0) return;

    showConfirm('批量删除', `确定要删除选中的 ${selectedListIds.size} 条笔记吗？`, async () => {
      const updated = notes.filter(n => !selectedListIds.has(n.id));
      const nextOpen = openNoteIds.filter(id => !selectedListIds.has(id));

      setNotes(updated);
      setOpenNoteIds(nextOpen);
      if (activeNoteId && selectedListIds.has(activeNoteId)) {
        setActiveNoteId(nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null);
      }
      if (ipcClient.isAvailable()) {
        for (const id of selectedListIds) await ipcClient.deleteNote(id);
      } else {
        saveNotesToDisk(updated, undefined, true);
      }
      setSelectedListIds(new Set());
      addToast(`${selectedListIds.size} 条笔记已删除`, 'info');
    }, true);
  }, [activeNoteId, addToast, notes, openNoteIds, saveNotesToDisk, selectedListIds, setActiveNoteId, setNotes, setOpenNoteIds, setSelectedListIds, showConfirm]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedListIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setSelectedListIds]);

  const handlePinNote = useCallback((id: string) => {
    const note = editingNotes.get(id) || notes.find(n => n.id === id);
    if (note) commitNoteUpdate(id, { isPinned: !note.isPinned });
  }, [commitNoteUpdate, editingNotes, notes]);

  const handleOpenWindow = useCallback((id: string) => {
    if (!ipcClient.isAvailable()) return;

    const note = editingNotes.get(id) || notes.find(n => n.id === id);
    if (!note) return;

    ipcClient.openNoteWindow({ ...note, isUnsaved: unsavedNoteIds.has(id) });
    closeTab(id, undefined, true);
  }, [closeTab, editingNotes, notes, unsavedNoteIds]);

  const handleMoveNoteRequest = useCallback((id: string) => {
    setMoveNoteModal({ isOpen: true, noteId: id });
  }, []);

  const closeMoveNoteModal = useCallback(() => {
    setMoveNoteModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirmMoveNote = useCallback((targetFolderId: string) => {
    if (!moveNoteModal.noteId) return;

    commitNoteUpdate(moveNoteModal.noteId, {
      folderId: targetFolderId === 'archive' ? 'all' : targetFolderId,
      isArchived: targetFolderId === 'archive',
    });
    addToast(targetFolderId === 'archive' ? '笔记已归档' : '笔记已移动', 'success');
  }, [addToast, commitNoteUpdate, moveNoteModal.noteId]);

  const handleAddTagRequest = useCallback((id: string) => {
    setTagSelectModal({ isOpen: true, noteId: id });
  }, []);

  const closeTagSelectModal = useCallback(() => {
    setTagSelectModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirmAddTag = useCallback((tag: string) => {
    if (!tagSelectModal.noteId) return;

    const note = editingNotes.get(tagSelectModal.noteId) || notes.find(n => n.id === tagSelectModal.noteId);
    if (note && !note.tags.includes(tag)) {
      commitNoteUpdate(tagSelectModal.noteId, { tags: [...note.tags, tag] });
      addToast(`标签 "${tag}" 已添加`, 'success');
    }
  }, [addToast, commitNoteUpdate, editingNotes, notes, tagSelectModal.noteId]);

  return {
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
  };
};
