const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe IPC surface to renderer
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    const wrapped = (_event, ...args) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
