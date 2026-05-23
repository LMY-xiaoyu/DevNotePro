import { useCallback, useEffect } from 'react';
import { Settings } from '../types';
import { ipcClient } from '../services/ipcClient';

export const useSettingsSync = (settings: Settings, isFloatingWindow: boolean, isFloatingOnTop: boolean) => {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
    ipcClient.send('set-always-on-top', isFloatingWindow ? isFloatingOnTop : settings.alwaysOnTop);
  }, [isFloatingOnTop, isFloatingWindow, settings.alwaysOnTop, settings.darkMode]);

  return useCallback(async () => {
    if (!ipcClient.isAvailable()) return;

    try {
      await ipcClient.saveSettings(settings);
      console.log('Settings saved to file:', settings);
    } catch (err) {
      console.error('Failed to save settings via IPC:', err);
    }
  }, [settings]);
};
