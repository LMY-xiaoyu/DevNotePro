import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { Folder, Note, Toast } from '../types';

interface FolderActionsOptions {
  customFolders: Folder[];
  notes: Note[];
  activeFolder: string;
  setCustomFolders: Dispatch<SetStateAction<Folder[]>>;
  setNotes: Dispatch<SetStateAction<Note[]>>;
  setActiveFolder: Dispatch<SetStateAction<string>>;
  saveFoldersToDisk: (folders: Folder[]) => Promise<void>;
  saveNotesToDisk: (notes: Note[], savedNoteId?: string, silent?: boolean) => Promise<void>;
  addToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (title: string, content: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const useFolderActions = ({
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
}: FolderActionsOptions) => {
  const [folderModal, setFolderModal] = useState<{ isOpen: boolean; mode: 'create' | 'rename'; folderId?: string; initialValue?: string }>({ isOpen: false, mode: 'create' });

  const openAddFolderModal = useCallback(() => {
    setFolderModal({ isOpen: true, mode: 'create', initialValue: '' });
  }, []);

  const openRenameFolderModal = useCallback((id: string) => {
    const folder = customFolders.find(f => f.id === id);
    if (folder) setFolderModal({ isOpen: true, mode: 'rename', folderId: id, initialValue: folder.name });
  }, [customFolders]);

  const closeFolderModal = useCallback(() => {
    setFolderModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleFolderModalConfirm = useCallback((name: string) => {
    if (folderModal.mode === 'create') {
      const newFolder: Folder = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), name };
      const updatedFolders = [...customFolders, newFolder];
      setCustomFolders(updatedFolders);
      saveFoldersToDisk(updatedFolders);
      addToast(`文件夹 "${name}" 已创建`, 'success');
      return;
    }

    if (folderModal.mode === 'rename' && folderModal.folderId) {
      const updatedFolders = customFolders.map(f => f.id === folderModal.folderId ? { ...f, name } : f);
      setCustomFolders(updatedFolders);
      saveFoldersToDisk(updatedFolders);
      addToast(`已重命名为 "${name}"`, 'success');
    }
  }, [addToast, customFolders, folderModal.folderId, folderModal.mode, saveFoldersToDisk, setCustomFolders]);

  const handleDeleteFolder = useCallback((id: string) => {
    showConfirm('删除文件夹', '确定删除此文件夹吗？其中的笔记将被移动到"全部笔记"。', () => {
      const updatedFolders = customFolders.filter(f => f.id !== id);
      const updatedNotes = notes.map(n => n.folderId === id ? { ...n, folderId: 'all' } : n);

      setCustomFolders(updatedFolders);
      saveFoldersToDisk(updatedFolders);
      setNotes(updatedNotes);
      saveNotesToDisk(updatedNotes, undefined, true);
      if (activeFolder === id) setActiveFolder('all');
      addToast('文件夹已删除', 'info');
    }, true);
  }, [activeFolder, addToast, customFolders, notes, saveFoldersToDisk, saveNotesToDisk, setActiveFolder, setCustomFolders, setNotes, showConfirm]);

  return {
    folderModal,
    openAddFolderModal,
    openRenameFolderModal,
    closeFolderModal,
    handleFolderModalConfirm,
    handleDeleteFolder,
  };
};
