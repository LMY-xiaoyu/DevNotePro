
import React, { useState, useMemo, useCallback } from 'react';
import { Folder, Archive, Plus, Settings as SettingsIcon, FolderPlus, Edit2, Trash2 } from 'lucide-react';
import { DEFAULT_FOLDERS } from '../constants';
import { Folder as FolderType } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';
import { getTagStyle } from '../utils';

interface SidebarProps {
  activeFolder: string;
  setActiveFolder: (id: string) => void;
  activeTag: string | null;
  setActiveTag: (tag: string) => void;
  tags: string[];
  customFolders: FolderType[];
  onAddFolder: () => void;
  onRenameFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ 
  activeFolder, 
  setActiveFolder, 
  activeTag,
  setActiveTag,
  tags, 
  customFolders, 
  onAddFolder, 
  onRenameFolder,
  onDeleteFolder, 
  onOpenSettings 
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId });
  }, []);

  const getContextMenuItems = useCallback((contextMenu: { x: number; y: number; folderId: string } | null, onRenameFolder: (id: string) => void, onDeleteFolder: (id: string) => void): MenuItem[] => [
    {
      label: '重命名',
      icon: <Edit2 size={14} />,
      action: () => contextMenu && onRenameFolder(contextMenu.folderId)
    },
    {
      label: '删除文件夹',
      icon: <Trash2 size={14} />,
      danger: true,
      action: () => contextMenu && onDeleteFolder(contextMenu.folderId)
    }
  ], []);

  // 分离归档文件夹
  const standardFolders = useMemo(() => DEFAULT_FOLDERS.filter(f => f.id !== 'archive'), []);
  const archiveFolder = useMemo(() => DEFAULT_FOLDERS.find(f => f.id === 'archive'), []);

  return (
    <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-xl">
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
          D
        </div>
        <h1 className="font-bold text-zinc-800 dark:text-zinc-100">开发者笔记 Pro</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hidden px-3 space-y-6">
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">工作区</h2>
            <button onClick={onAddFolder} data-tooltip="添加文件夹" className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors no-drag">
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-0.5">
            {standardFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  activeFolder === folder.id && !activeTag
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Folder size={16} />
                {folder.name}
              </button>
            ))}

            {/* Custom Folders with Context Menu */}
            {customFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                onContextMenu={(e) => handleContextMenu(e, folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  activeFolder === folder.id && !activeTag
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <FolderPlus size={16} />
                {folder.name}
              </button>
            ))}

            {archiveFolder && (
              <button
                key={archiveFolder.id}
                onClick={() => setActiveFolder(archiveFolder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  activeFolder === archiveFolder.id && !activeTag
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Archive size={16} />
                {archiveFolder.name}
              </button>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">标签云</h2>
          <div className="flex flex-wrap gap-2 px-2">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={getTagStyle(tag, activeTag === tag)}
                >
                  {tag}
                </button>
              ))
            ) : (
              <p className="text-xs text-zinc-400 italic">暂无标签</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <SettingsIcon size={16} />
          设置中心
        </button>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu, onRenameFolder, onDeleteFolder)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
