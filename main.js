
const { app, BrowserWindow, Tray, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

// Track all open windows
const windows = new Set();
let mainWindow = null; 
let tray = null;
let isQuitting = false; 
// Track floating windows by note ID
const floatingWindows = new Map();

// --- Storage Configuration ---
const DATA_DIR = app.isPackaged
  ? path.join(path.dirname(process.execPath), 'data')
  : path.join(__dirname, 'data');

const NOTES_DIR = path.join(DATA_DIR, 'Notes');
const IMAGES_DIR = path.join(DATA_DIR, 'Images');
const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');
const LEGACY_NOTES_FILE = path.join(DATA_DIR, 'notes.json');

const getIconPath = () => {
  const iconName = 'app.png';
  return app.isPackaged
    ? path.join(process.resourcesPath, 'static', iconName)
    : path.join(__dirname, 'static', iconName);
};

// 设置文件路径
const SETTINGS_FILE = path.join(DATA_DIR, 'setting.json');

const ensureDirs = () => {
  [DATA_DIR, NOTES_DIR, IMAGES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};
ensureDirs();

const migrateLegacyNotes = async () => {
  try {
    if (fs.existsSync(LEGACY_NOTES_FILE) && fs.existsSync(NOTES_DIR)) {
      const files = await fsPromises.readdir(NOTES_DIR);
      if (files.length === 0) {
        const data = await fsPromises.readFile(LEGACY_NOTES_FILE, 'utf-8');
        const notes = JSON.parse(data);
        const writePromises = notes.map(note => 
          fsPromises.writeFile(path.join(NOTES_DIR, `${note.id}.json`), JSON.stringify(note, null, 2), 'utf-8')
        );
        await Promise.all(writePromises);
        await fsPromises.rename(LEGACY_NOTES_FILE, `${LEGACY_NOTES_FILE}.bak`);
      }
    }
  } catch (err) {
    console.error('Migration failed:', err);
  }
};



function createWindow() {
  const iconPath = getIconPath();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false 
    },

  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // 打开开发者工具
  win.webContents.openDevTools();

  win.once('ready-to-show', () => {
    win.show();
  });
  
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide(); 
      return false;
    }
    return true;
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  windows.add(win);
  mainWindow = win;
  
  win.on('closed', () => {
    windows.delete(win);
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

function createFloatingWindow(noteId, isUnsaved = false) {
  // 检查是否已经存在该笔记ID对应的浮动窗口
  if (floatingWindows.has(noteId)) {
    const existingWin = floatingWindows.get(noteId);
    if (existingWin && !existingWin.isDestroyed()) {
      // 如果存在，显示并聚焦该窗口
      existingWin.show();
      existingWin.focus();
      return;
    }
  }

  const iconPath = getIconPath();
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },

  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'), { search: `?noteId=${noteId}&isUnsaved=${isUnsaved}` });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('close', (event) => {
    if (!isQuitting && windows.size === 1) {
        event.preventDefault();
        win.hide();
        return false;
    }
    return true;
  });

  windows.add(win);
  // 保存该笔记ID对应的浮动窗口
  floatingWindows.set(noteId, win);
  win.on('closed', () => {
    windows.delete(win);
    // 当窗口关闭时，从floatingWindows中移除
    floatingWindows.delete(noteId);
  });
}

// Fixed Tray New Note: Create a file and open it as a floating window directly
async function handleNewNoteFromTray() {
  const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const newNote = {
    id: newId,
    title: '',
    content: '',
    tags: [],
    folderId: 'all',
    language: 'text',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isArchived: false,
    isPinned: false,
  };
  
  try {
    const encodedNote = encodeNote(newNote);
    await fsPromises.writeFile(path.join(NOTES_DIR, `${newId}.json`), JSON.stringify(encodedNote, null, 2), 'utf-8');
    createFloatingWindow(newId);
    // Broadcast to main window if it exists to refresh list
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('note-updated-single', newNote);
    }
  } catch (err) {
    console.error('Failed to create tray note:', err);
  }
}

function createTray() {
  try {
    const iconPath = getIconPath();
    tray = new Tray(fs.existsSync(iconPath) ? iconPath : path.join(__dirname, 'main.js'));
    
    const contextMenu = Menu.buildFromTemplate([
      { label: '打开主面板', click: () => {
          if (!mainWindow) createWindow();
          else {
            mainWindow.show();
            mainWindow.focus();
          }
      }},
      { type: 'separator' },
      { label: '新建笔记 (独立窗口)', click: () => { 
          handleNewNoteFromTray();
      }},
      { label: '设置中心', click: () => { 
          if (!mainWindow) createWindow();
          mainWindow.show();
          mainWindow.focus();
          // Small delay ensures the window is ready and focused before triggering modal
          setTimeout(() => {
            mainWindow.webContents.send('open-settings'); 
          }, 100);
      }},
      { type: 'separator' },
      { label: '退出程序', click: () => { 
          isQuitting = true; 
          app.quit(); 
      }}
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('DevNote Pro - 开发者笔记');
    tray.on('double-click', () => {
        if (!mainWindow) createWindow();
        else {
          mainWindow.show();
          mainWindow.focus();
        }
    });
  } catch (e) {
    console.error('Tray creation failed:', e);
  }
}

// --- IPC Handlers ---

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.hide();
  }
});

ipcMain.on('set-always-on-top', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setAlwaysOnTop(flag, 'floating');
});

ipcMain.on('broadcast-settings', (event, settings) => {
  for (const win of windows) {
    if (!win.isDestroyed() && win.webContents.id !== event.sender.id) {
      win.webContents.send('settings-updated', settings);
    }
  }
});

ipcMain.handle('open-note-window', async (event, noteData) => {
  const noteId = noteData.id;
  // 确保笔记文件已经保存
  const notePath = path.join(NOTES_DIR, `${noteId}.json`);
  
  // 不管笔记文件是否存在，都更新文件内容为最新的笔记数据
  // 这样可以确保新窗口能够加载到最新的笔记内容
  // 移除isUnsaved属性，因为它不是笔记数据的一部分
  const { isUnsaved, ...noteWithoutUnsaved } = noteData;
  // 对笔记数据进行base64编码，确保特殊字符不会导致文件损坏
  const encodedNote = encodeNote(noteWithoutUnsaved);
  await fsPromises.writeFile(notePath, JSON.stringify(encodedNote, null, 2), 'utf-8');
  
  // 创建浮动窗口，传递isUnsaved状态
  createFloatingWindow(noteId, isUnsaved);
});

// --- File System IPC ---

// 解码笔记标题和内容
function decodeNote(note) {
  if (!note) return null;
  try {
    if (note.title) {
      note.title = Buffer.from(note.title, 'base64').toString('utf8');
    }
    if (note.content) {
      note.content = Buffer.from(note.content, 'base64').toString('utf8');
    }
    return note;
  } catch (e) {
    console.error('Failed to decode note:', e);
    return note; // 如果解码失败，返回原始笔记
  }
}

// 编码笔记标题和内容
function encodeNote(note) {
  if (!note) return null;
  try {
    const encodedNote = { ...note };
    if (encodedNote.title) {
      encodedNote.title = Buffer.from(encodedNote.title, 'utf8').toString('base64');
    }
    if (encodedNote.content) {
      encodedNote.content = Buffer.from(encodedNote.content, 'utf8').toString('base64');
    }
    return encodedNote;
  } catch (e) {
    console.error('Failed to encode note:', e);
    return note; // 如果编码失败，返回原始笔记
  }
}

ipcMain.handle('read-notes', async () => {
  try {
    console.log('Reading notes from:', NOTES_DIR);
    const files = await fsPromises.readdir(NOTES_DIR);
    console.log('Found files:', files);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log('Found JSON files:', jsonFiles);
    const readPromises = jsonFiles.map(async file => {
      try {
        const content = await fsPromises.readFile(path.join(NOTES_DIR, file), 'utf-8');
        const note = JSON.parse(content);
        const decodedNote = decodeNote(note);
        console.log('Read note:', file, decodedNote.id);
        return decodedNote;
      } catch (e) {
        console.error('Failed to read note:', file, e);
        return null;
      }
    });
    const notes = (await Promise.all(readPromises)).filter(n => n !== null);
    console.log('Loaded notes:', notes.length);
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Failed to read notes:', err);
    return [];
  }
});

ipcMain.handle('read-note', async (event, noteId) => {
  try {
    const notePath = path.join(NOTES_DIR, `${noteId}.json`);
    if (fs.existsSync(notePath)) {
      const content = await fsPromises.readFile(notePath, 'utf-8');
      const note = JSON.parse(content);
      return decodeNote(note);
    }
  } catch (err) {
    console.error('Failed to read note:', err);
  }
  return null;
});

ipcMain.handle('save-note', async (event, note) => {
  try {
    const encodedNote = encodeNote(note);
    const filePath = path.join(NOTES_DIR, `${note.id}.json`);
    await fsPromises.writeFile(filePath, JSON.stringify(encodedNote, null, 2), 'utf-8');
    for (const win of windows) {
      if (!win.isDestroyed()) win.webContents.send('note-updated-single', note);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-notes', async (event, notes) => {
  try {
    const writePromises = notes.map(note => {
      const encodedNote = encodeNote(note);
      return fsPromises.writeFile(path.join(NOTES_DIR, `${note.id}.json`), JSON.stringify(encodedNote, null, 2), 'utf-8');
    });
    await Promise.all(writePromises);
    for (const win of windows) {
      if (!win.isDestroyed()) win.webContents.send('notes-updated', notes);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-note', async (event, noteId) => {
  try {
    const filePath = path.join(NOTES_DIR, `${noteId}.json`);
    if (fs.existsSync(filePath)) await fsPromises.unlink(filePath);
    // 广播笔记删除事件到所有窗口
    for (const win of windows) {
      if (!win.isDestroyed()) win.webContents.send('note-deleted', noteId);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-image', async (event, { name, data }) => {
  try {
    const fileName = `${Date.now()}_${name.replace(/[^a-z0-9.]/gi, '_')}`;
    const filePath = path.join(IMAGES_DIR, fileName);
    await fsPromises.writeFile(filePath, Buffer.from(data));
    return `file://${filePath.replace(/\\/g, '/')}`;
  } catch (err) {
    return null;
  }
});

ipcMain.handle('read-folders', async () => {
  try {
    if (fs.existsSync(FOLDERS_FILE)) {
      const data = await fsPromises.readFile(FOLDERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {}
  return [];
});

ipcMain.handle('save-folders', async (event, folders) => {
  try {
    await fsPromises.writeFile(FOLDERS_FILE, JSON.stringify(folders, null, 2), 'utf-8');
    for (const win of windows) {
      if (!win.isDestroyed()) win.webContents.send('folders-updated', folders);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-settings', async () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = await fsPromises.readFile(SETTINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read settings:', err);
  }
  // 如果设置文件不存在或读取失败，返回默认设置
  const defaultSettings = {
    darkMode: true,
    accentColor: '#3b82f6',
    fontSize: 14,
    transparency: 100,
    floatingPosition: {
      x: 100,
      y: 100,
      width: 700,
      height: 500
    },
    alwaysOnTop: false,
    minimizeToTray: true
  };
  // 将默认设置保存到文件
  try {
    await fsPromises.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save default settings:', err);
  }
  return defaultSettings;
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    await fsPromises.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    for (const win of windows) {
      if (!win.isDestroyed()) win.webContents.send('settings-updated', settings);
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to save settings:', err);
    return { success: false, error: err.message };
  }
});

// --- Lifecycle ---

app.whenReady().then(async () => {
  await migrateLegacyNotes();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
        app.quit();
    }
  }
});

app.on('activate', () => {
  if (windows.size === 0) createWindow();
  else if (mainWindow) {
      mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
