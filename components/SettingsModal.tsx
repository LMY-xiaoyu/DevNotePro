
import React, { useState, useEffect } from 'react';
import { X, Sun, Palette, Type, Monitor } from 'lucide-react';
import { Settings } from '../types';
import { ACCENT_COLORS } from '../constants';

interface SettingsModalProps {
  settings: Settings;
  onUpdateSettings: (updates: Partial<Settings>) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdateSettings, onClose }) => {
  // Use local state to handle immediate UI feedback and prevent "jumping" during IPC sync
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  // Keep local state in sync with prop updates (broadcasts from other windows)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleUpdateLocal = (updates: Partial<Settings>) => {
    const nextSettings = { ...localSettings, ...updates };
    setLocalSettings(nextSettings);
    // Propagate change to parent (App.tsx) immediately for preview
    onUpdateSettings(updates);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold">设置中心</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* 外观 */}
          <section>
            <div className="flex items-center gap-2 text-zinc-400 mb-4">
              <Sun size={14} />
              <h3 className="text-xs font-bold uppercase tracking-wider">外观展示</h3>
            </div>
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 transition-colors">
              <span className="text-sm font-medium">深色模式</span>
              <button
                onClick={() => handleUpdateLocal({ darkMode: !localSettings.darkMode })}
                className={`w-12 h-6 rounded-full transition-all relative ${localSettings.darkMode ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          {/* 系统 */}
          <section>
            <div className="flex items-center gap-2 text-zinc-400 mb-4">
              <Monitor size={14} />
              <h3 className="text-xs font-bold uppercase tracking-wider">系统集成</h3>
            </div>
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 transition-colors">
              <span className="text-sm font-medium">关闭窗口到系统托盘</span>
              <button
                onClick={() => handleUpdateLocal({ minimizeToTray: !localSettings.minimizeToTray })}
                className={`w-12 h-6 rounded-full transition-all relative ${localSettings.minimizeToTray ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.minimizeToTray ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          {/* 主题色 */}
          <section>
            <div className="flex items-center gap-2 text-zinc-400 mb-4">
              <Palette size={14} />
              <h3 className="text-xs font-bold uppercase tracking-wider">主题色彩</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleUpdateLocal({ accentColor: color.value })}
                  title={color.name}
                  className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${localSettings.accentColor === color.value ? 'border-zinc-900 dark:border-zinc-100 scale-105 shadow-lg' : 'border-transparent shadow-sm'}`}
                  style={{ backgroundColor: color.value }}
                >
                    {localSettings.accentColor === color.value && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                </button>
              ))}
            </div>
          </section>

          {/* 偏好 */}
          <section>
            <div className="flex items-center gap-2 text-zinc-400 mb-4">
              <Type size={14} />
              <h3 className="text-xs font-bold uppercase tracking-wider">编辑器偏好</h3>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-medium mb-2">
                  <span>正文字体大小</span>
                  <span className="text-blue-500">{localSettings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={localSettings.fontSize}
                  onChange={(e) => handleUpdateLocal({ fontSize: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-2">
                  <span>分离窗口透明度</span>
                  <span className="text-blue-500">{localSettings.transparency}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={localSettings.transparency}
                  onChange={(e) => handleUpdateLocal({ transparency: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            style={{ backgroundColor: localSettings.accentColor }}
            className="w-full text-white py-3.5 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
          >
            保存并返回
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
