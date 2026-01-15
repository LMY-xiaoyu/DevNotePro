
export type Language = 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'html' | 'css' | 'markdown' | 'text';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId: string;
  language: Language;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
  isPinned: boolean;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
}

export interface Settings {
  darkMode: boolean;
  accentColor: string;
  fontSize: number;
  transparency: number;
  floatingPosition: { x: number; y: number; width: number; height: number };
  alwaysOnTop: boolean;
  minimizeToTray: boolean;
}

export type ViewState = 'standard' | 'floating';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}
