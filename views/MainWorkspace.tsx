import React, { RefObject } from 'react';
import { Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NoteList from '../components/NoteList';
import Editor from '../components/Editor';
import TitleBar from '../components/TitleBar';
import EditorTabs from './EditorTabs';
import { Folder, Note, Settings } from '../types';

interface MainWorkspaceProps {
  notes: Note[];
  filteredNotes: Note[];
  customFolders: Folder[];
  tags: string[];
  activeNote: Note | null;
  activeNoteId: string | null;
  activeFolder: string;
  activeTag: string | null;
  openNoteIds: string[];
  unsavedNoteIds: Set<string>;
  selectedListIds: Set<string>;
  searchQuery: string;
  settings: Settings;
  tabHeaderRef: RefObject<HTMLDivElement>;
  onMinimize: () => void;
  onClose: () => void;
  onAddNote: () => void;
  onOpenSettings: () => void;
  onNavigateFolder: (folderId: string) => void;
  onNavigateTag: (tag: string) => void;
  onAddFolder: () => void;
  onRenameFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onSelectNote: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onBatchDelete: () => void;
  onSearchQueryChange: (query: string) => void;
  onPinNote: (id: string) => void;
  onMoveNote: (id: string) => void;
  onOpenWindow: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onReorderNotes: (draggedId: string, targetId: string) => void;
  onAddTag: (id: string) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onSaveActiveNote: () => void;
  onToggleWindowTop: () => void;
  onTabContextMenu: (e: React.MouseEvent, noteId: string) => void;
  onTabDragEnd: (e: React.DragEvent, id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
}

const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  notes,
  filteredNotes,
  customFolders,
  tags,
  activeNote,
  activeNoteId,
  activeFolder,
  activeTag,
  openNoteIds,
  unsavedNoteIds,
  selectedListIds,
  searchQuery,
  settings,
  tabHeaderRef,
  onMinimize,
  onClose,
  onAddNote,
  onOpenSettings,
  onNavigateFolder,
  onNavigateTag,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onSelectNote,
  onToggleSelect,
  onBatchDelete,
  onSearchQueryChange,
  onPinNote,
  onMoveNote,
  onOpenWindow,
  onDeleteNote,
  onReorderNotes,
  onAddTag,
  onUpdateNote,
  onSaveActiveNote,
  onToggleWindowTop,
  onTabContextMenu,
  onTabDragEnd,
  onCloseTab,
}) => (
  <div className={`flex flex-col h-screen w-screen overflow-hidden ${settings.darkMode ? 'dark' : ''} bg-gradient-to-br from-[rgb(86_100_123_/_50%)] to-[rgb(86_100_123_/_30%)] dark:from-[rgb(86_100_123_/_20%)] dark:to-[rgb(86_100_123_/_10%)]`}>
    <TitleBar title="DevNote Pro" onMinimize={onMinimize} onClose={onClose} />
    <div className="flex flex-1 overflow-hidden p-[0.26rem] gap-[0.26rem]">
      <div className="w-64 rounded-lg shadow-md overflow-hidden bg-white dark:bg-zinc-900">
        <Sidebar activeFolder={activeFolder} setActiveFolder={onNavigateFolder} activeTag={activeTag} setActiveTag={onNavigateTag} tags={tags} customFolders={customFolders} onAddFolder={onAddFolder} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder} onOpenSettings={onOpenSettings} />
      </div>

      <div className="w-80 rounded-lg shadow-md overflow-hidden bg-white dark:bg-zinc-900">
        <NoteList notes={filteredNotes} selectedNoteId={activeNoteId} onSelectNote={onSelectNote} selectedListIds={selectedListIds} onToggleSelect={onToggleSelect} onBatchDelete={onBatchDelete} searchQuery={searchQuery} setSearchQuery={onSearchQueryChange} onPinNote={onPinNote} onMoveNote={onMoveNote} onOpenWindow={onOpenWindow} onDeleteNote={onDeleteNote} onReorderNotes={onReorderNotes} onAddTag={onAddTag} />
      </div>

      <div className="flex-1 rounded-lg shadow-md overflow-hidden bg-white dark:bg-zinc-900">
        <EditorTabs notes={notes} openNoteIds={openNoteIds} activeNoteId={activeNoteId} unsavedNoteIds={unsavedNoteIds} settings={settings} tabHeaderRef={tabHeaderRef} onSelectNote={onSelectNote} onContextMenu={onTabContextMenu} onDragEnd={onTabDragEnd} onCloseTab={onCloseTab} />
        {activeNote ? (
          <Editor note={activeNote} onUpdateNote={onUpdateNote} onDeleteNote={onDeleteNote} onSave={onSaveActiveNote} onTogglePin={onPinNote} viewState="standard" setViewState={() => { if (activeNoteId) onOpenWindow(activeNoteId); }} isWindowOnTop={settings.alwaysOnTop} onToggleWindowTop={onToggleWindowTop} settings={settings} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-300 dark:text-zinc-700 font-bold">
            <p className="text-sm">选择或创建笔记</p>
          </div>
        )}
      </div>

      <button onClick={onAddNote} style={{ backgroundColor: settings.accentColor }} className="fixed bottom-12 right-12 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-10 no-drag" data-tooltip="新建笔记 (Ctrl + N)">
        <Plus size={24} />
      </button>
    </div>
  </div>
);

export default MainWorkspace;
