
import React, { useState, useMemo, useCallback } from 'react';
import { Search, Pin, Calendar, Trash2, PinOff, ExternalLink, FolderInput, Plus } from 'lucide-react';
import { Note } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';
import { getTagStyle } from '../utils';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  selectedListIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onBatchDelete: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // New actions for Context Menu
  onPinNote: (id: string) => void;
  onMoveNote: (id: string) => void;
  onOpenWindow: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onAddTag: (id: string) => void;
  // Reorder
  onReorderNotes: (draggedId: string, targetId: string) => void;
}

const NoteList: React.FC<NoteListProps> = React.memo(({ 
  notes, 
  selectedNoteId, 
  onSelectNote, 
  selectedListIds,
  onToggleSelect,
  onBatchDelete,
  searchQuery, 
  setSearchQuery,
  onPinNote,
  onMoveNote,
  onOpenWindow,
  onDeleteNote,
  onAddTag,
  onReorderNotes
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  
  // Custom Tag Tooltip State
  const [hoveredTags, setHoveredTags] = useState<{ tags: string[]; x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, noteId });
  }, []);

  const getContextMenuItems = useCallback((noteId: string, notes: Note[]): MenuItem[] => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return [];
    
    return [
      {
        label: note.isPinned ? '取消置顶' : '置顶笔记',
        icon: note.isPinned ? <PinOff size={14} /> : <Pin size={14} />,
        action: () => onPinNote(noteId)
      },
      {
        label: '移动到...',
        icon: <FolderInput size={14} />,
        action: () => onMoveNote(noteId)
      },
      {
        label: '添加标签',
        icon: <Plus size={14} />,
        action: () => onAddTag(noteId)
      },
      {
        label: '独立窗口打开',
        icon: <ExternalLink size={14} />,
        action: () => onOpenWindow(noteId)
      },
      {
        label: '删除笔记',
        icon: <Trash2 size={14} />,
        danger: true,
        action: () => onDeleteNote(noteId)
      }
    ];
  }, [onPinNote, onMoveNote, onAddTag, onOpenWindow, onDeleteNote]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [notes, searchQuery]);

  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedNoteId(id);
    e.dataTransfer.setData('noteId', id);
    e.dataTransfer.effectAllowed = 'move';
    // 设置拖拽时的视觉效果
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('noteId');
    if (draggedId && draggedId !== targetId) {
      onReorderNotes(draggedId, targetId);
    }
    setDraggedNoteId(null);
    setDragOverId(null);
  }, [onReorderNotes]);

  const handleToggleSelect = useCallback((e: React.MouseEvent, id: string, onToggleSelect: (id: string) => void) => {
    e.stopPropagation();
    onToggleSelect(id);
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent, tags: string[]) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTags({
      tags,
      x: rect.left,
      y: rect.bottom + 8
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredTags(null);
  }, []);

  return (
    <div className="w-80 flex flex-col h-full bg-white dark:bg-zinc-950">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索笔记... (Ctrl+F)"
            className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {selectedListIds.size > 0 && (
           <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg animate-in slide-in-from-top-2">
             <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
               已选择 {selectedListIds.size} 项
             </span>
             <button 
               onClick={onBatchDelete}
               className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
               data-tooltip="批量删除"
             >
               <Trash2 size={12} />
               批量删除
             </button>
           </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hidden">
        {filteredNotes.length > 0 ? (
          <div className="space-y-0">
            {filteredNotes.map((note) => {
             const isSelected = selectedListIds.has(note.id);
             const displayTitle = note.title.trim() || note.content.trim().slice(0, 30).replace(/\n/g, ' ') || '无标题笔记';
              
             return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragOver={(e) => handleDragOver(e, note.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, note.id)}
                className={`group relative w-full text-left p-4 border-b border-zinc-100 dark:border-zinc-900 transition-all duration-200 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                  selectedNoteId === note.id ? 'bg-zinc-50 dark:bg-zinc-900' : ''
                } ${draggedNoteId === note.id ? 'opacity-50 scale-95' : ''} ${dragOverId === note.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                onClick={() => onSelectNote(note.id)}
                onContextMenu={(e) => handleContextMenu(e, note.id)}
              >
                {/* Checkbox aligned with Title */}
                <div 
                   className={`absolute top-4 right-3 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                   onClick={(e) => handleToggleSelect(e, note.id, onToggleSelect)}
                >
                   <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:border-blue-400'
                   }`}>
                      {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                   </div>
                </div>

                <div className="flex items-center gap-2 mb-1 pr-6">
                  {note.isPinned && <Pin size={12} className="text-blue-500 shrink-0" fill="currentColor" />}
                  <h3 className={`text-sm font-semibold truncate ${selectedNoteId === note.id ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-800 dark:text-zinc-100'} ${!note.title.trim() && 'italic opacity-80'}`}>
                    {displayTitle}
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2 leading-relaxed h-8">
                  {note.content.substring(0, 100) || '暂无内容...'}
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 uppercase tracking-tight">
                        <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                    </div>
                    {note.tags.length > 0 && (
                        <div 
                            className="flex items-center gap-1 overflow-hidden max-w-[120px]" 
                            onMouseEnter={(e) => handleMouseEnter(e, note.tags)}
                            onMouseLeave={handleMouseLeave}
                        >
                            {note.tags.slice(0, 3).map(tag => (
                                <span key={tag} className={getTagStyle(tag)}>
                                    {tag}
                                </span>
                            ))}
                            {note.tags.length > 3 && <span className="text-[9px] text-zinc-400">+{note.tags.length - 3}</span>}
                        </div>
                    )}
                </div>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8 text-center">
            <Search size={32} className="mb-2 opacity-20" />
            <p className="text-sm">未找到匹配的笔记</p>
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.noteId, notes)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {hoveredTags && (
        <div 
          className="fixed z-[9999] px-3 py-2 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-2 max-w-[300px] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
          style={{ top: hoveredTags.y, left: hoveredTags.x }}
        >
          {hoveredTags.tags.map(tag => (
            <span key={tag} className={getTagStyle(tag)}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

NoteList.displayName = 'NoteList';

export default NoteList;
