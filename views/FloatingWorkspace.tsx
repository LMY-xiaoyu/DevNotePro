import React from 'react';
import Editor from '../components/Editor';
import TitleBar from '../components/TitleBar';
import { Note, Settings } from '../types';

interface FloatingWorkspaceProps {
  note: Note;
  settings: Settings;
  isUnsaved: boolean;
  isWindowOnTop: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onSave: () => void;
  onTogglePin: (id: string) => void;
  onToggleWindowTop: () => void;
}

const FloatingWorkspace: React.FC<FloatingWorkspaceProps> = ({
  note,
  settings,
  isUnsaved,
  isWindowOnTop,
  onMinimize,
  onClose,
  onUpdateNote,
  onDeleteNote,
  onSave,
  onTogglePin,
  onToggleWindowTop,
}) => (
  <div className={`flex flex-col h-screen w-screen overflow-hidden ${settings.darkMode ? 'dark' : ''} bg-gradient-to-br from-[rgb(86_100_123_/_50%)] to-[rgb(86_100_123_/_30%)] dark:from-[rgb(86_100_123_/_20%)] dark:to-[rgb(86_100_123_/_10%)] border border-zinc-200 dark:border-zinc-800`}>
    <TitleBar title={`${note.title || '独立窗口'}${isUnsaved ? ' (未保存)' : ''}`} onMinimize={onMinimize} onClose={onClose} />
    <Editor note={note} onUpdateNote={onUpdateNote} onDeleteNote={onDeleteNote} onSave={onSave} onTogglePin={onTogglePin} viewState="floating" setViewState={onClose} isWindowOnTop={isWindowOnTop} onToggleWindowTop={onToggleWindowTop} settings={settings} />
  </div>
);

export default FloatingWorkspace;
