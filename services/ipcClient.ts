import { Note, Settings, Folder } from '../types';

type IpcListener = (...args: any[]) => void;

interface IpcRendererLike {
  send: (channel: string, ...args: any[]) => void;
  invoke: <T = any>(channel: string, ...args: any[]) => Promise<T>;
  on: (channel: string, listener: IpcListener) => void | (() => void);
}

const getIpcRenderer = (): IpcRendererLike | null => {
  const wp = window as any;
  if (wp?.ipcRenderer) return wp.ipcRenderer;
  if (wp?.require) {
    try {
      return wp.require('electron').ipcRenderer;
    } catch {
      return null;
    }
  }
  return null;
};

const on = (channel: string, listener: IpcListener) => {
  const ipc = getIpcRenderer();
  if (!ipc) return () => {};

  const unsubscribe = ipc.on(channel, listener);
  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
};

export const ipcClient = {
  isAvailable: () => !!getIpcRenderer(),
  send: (channel: string, ...args: any[]) => getIpcRenderer()?.send(channel, ...args),
  invoke: <T = any>(channel: string, ...args: any[]): Promise<T> => {
    const ipc = getIpcRenderer();
    if (!ipc) return Promise.reject(new Error('IPC is not available'));
    return ipc.invoke<T>(channel, ...args);
  },
  on,
  readNotes: () => ipcClient.invoke<Note[]>('read-notes'),
  readNote: (noteId: string) => ipcClient.invoke<Note | null>('read-note', noteId),
  saveNote: (note: Note) => ipcClient.invoke<{ success: boolean; error?: string }>('save-note', note),
  saveNotes: (notes: Note[]) => ipcClient.invoke<{ success: boolean; error?: string }>('save-notes', notes),
  deleteNote: (noteId: string) => ipcClient.invoke<{ success: boolean; error?: string }>('delete-note', noteId),
  readFolders: () => ipcClient.invoke<Folder[]>('read-folders'),
  saveFolders: (folders: Folder[]) => ipcClient.invoke<{ success: boolean; error?: string }>('save-folders', folders),
  readSettings: () => ipcClient.invoke<Settings>('read-settings'),
  saveSettings: (settings: Settings) => ipcClient.invoke<{ success: boolean; error?: string }>('save-settings', settings),
  openNoteWindow: (note: Note & { isUnsaved?: boolean }) => ipcClient.invoke<void>('open-note-window', note),
};
