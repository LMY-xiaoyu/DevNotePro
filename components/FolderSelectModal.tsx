
import React from 'react';
import { X, Folder, FolderPlus, Archive } from 'lucide-react';
import { Folder as FolderType } from '../types';
import { DEFAULT_FOLDERS } from '../constants';

interface FolderSelectModalProps {
  isOpen: boolean;
  customFolders: FolderType[];
  onSelect: (folderId: string) => void;
  onClose: () => void;
}

const FolderSelectModal: React.FC<FolderSelectModalProps> = ({ isOpen, customFolders, onSelect, onClose }) => {
  if (!isOpen) return null;

  const allFolders = [
    ...DEFAULT_FOLDERS.filter(f => f.id !== 'archive'), // Standard folders except Archive
    ...customFolders,
    DEFAULT_FOLDERS.find(f => f.id === 'archive')! // Archive at the end
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">移动到...</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {allFolders.map(folder => (
            <button
              key={folder.id}
              onClick={() => {
                onSelect(folder.id);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {folder.id === 'archive' ? <Archive size={16} /> : 
               DEFAULT_FOLDERS.some(df => df.id === folder.id) ? <Folder size={16} /> : <FolderPlus size={16} />}
              {folder.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FolderSelectModal;
