import React, { RefObject } from 'react';
import { FileText, GripVertical, X } from 'lucide-react';
import { Note, Settings } from '../types';

interface EditorTabsProps {
  notes: Note[];
  openNoteIds: string[];
  activeNoteId: string | null;
  unsavedNoteIds: Set<string>;
  settings: Settings;
  tabHeaderRef: RefObject<HTMLDivElement>;
  onSelectNote: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, noteId: string) => void;
  onDragEnd: (e: React.DragEvent, id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
}

const EditorTabs: React.FC<EditorTabsProps> = ({
  notes,
  openNoteIds,
  activeNoteId,
  unsavedNoteIds,
  settings,
  tabHeaderRef,
  onSelectNote,
  onContextMenu,
  onDragEnd,
  onCloseTab,
}) => {
  if (openNoteIds.length === 0) return null;

  return (
    <div ref={tabHeaderRef} className="flex items-center bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-hidden tab-scrollbar">
      {openNoteIds.map(id => {
        const note = notes.find(n => n.id === id);
        if (!note) return null;

        const isActive = activeNoteId === id;
        const isUnsaved = unsavedNoteIds.has(id);
        const fallbackTitle = note.content.length > 0
          ? note.content.substring(0, 20) + (note.content.length > 20 ? '...' : '')
          : '无标题';

        return (
          <div
            key={id}
            onClick={() => onSelectNote(id)}
            onContextMenu={(e) => onContextMenu(e, id)}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/devnote-tab', id)}
            onDragEnd={(e) => onDragEnd(e, id)}
            className={`group relative flex items-center gap-2 px-4 py-2.5 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-zinc-300 dark:border-zinc-800 select-none transition-colors ${isActive ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium border-b-0' : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'}`}
          >
            {isActive && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: settings.accentColor }} />}
            <div className="opacity-0 group-hover:opacity-20 cursor-grab active:cursor-grabbing"><GripVertical size={10} /></div>
            <FileText size={12} className={isActive ? 'opacity-100' : 'opacity-50'} />
            <span className="truncate flex-1">{note.title || fallbackTitle}</span>
            {isUnsaved && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="未保存" />}
            <button onClick={(e) => onCloseTab(id, e)} className={`p-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 ${isActive || isUnsaved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default EditorTabs;
