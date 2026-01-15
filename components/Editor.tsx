import React, { useState, useRef, useEffect, memo } from 'react';
import { Trash2, Pin, PinOff, Tag as TagIcon, ExternalLink, Hash as HashIcon, Plus as PlusIcon, Save, X, ArrowUpToLine } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-markup'; 

import { Note, Language } from '../types';
import { LANGUAGES } from '../constants';
import { getTagStyle } from '../utils';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onSave: () => void;
  viewState: 'standard' | 'floating';
  setViewState: (v: 'standard' | 'floating') => void;
  accentColor: string;
  isWindowOnTop: boolean;
  onToggleWindowTop: () => void;
}

const EditorComponent: React.FC<EditorProps> = memo(({ 
  note, 
  onUpdateNote, 
  onDeleteNote, 
  onSave, 
  viewState, 
  setViewState, 
  isWindowOnTop,
  onToggleWindowTop
}) => {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isAddingTag]);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <TagIcon size={32} className="opacity-20" />
          </div>
          <p className="text-sm font-medium">请选择一条笔记开始记录</p>
          <p className="text-xs mt-2 opacity-60">或按 <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">Ctrl + N</span> 创建新笔记</p>
        </div>
      </div>
    );
  }

  const handleChange = (newContent: string) => {
    onUpdateNote(note.id, { content: newContent, updatedAt: Date.now() });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote(note.id, { title: e.target.value, updatedAt: Date.now() });
  };

  const handleTogglePin = () => {
    onUpdateNote(note.id, { isPinned: !note.isPinned });
  };

  const handleStartAddTag = () => {
    setIsAddingTag(true);
    setNewTagValue('');
  };

  const handleSubmitTag = () => {
    const tag = newTagValue.trim();
    if (tag && !note.tags.includes(tag)) {
      onUpdateNote(note.id, { tags: [...note.tags, tag], updatedAt: Date.now() });
    }
    setIsAddingTag(false);
    setNewTagValue('');
  };

  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitTag();
    } else if (e.key === 'Escape') {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote(note.id, { 
      tags: note.tags.filter(t => t !== tagToRemove),
      updatedAt: Date.now() 
    });
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!e.clipboardData.items) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const buffer = await file.arrayBuffer();
          const ipcRenderer = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
          if (ipcRenderer) {
            try {
              const imageUrl = await ipcRenderer.invoke('save-image', {
                name: file.name || 'image.png',
                data: buffer
              });
              if (imageUrl) {
                const imageMarkdown = `\n![Image](${imageUrl})\n`;
                const activeEl = document.activeElement as HTMLTextAreaElement;
                if (activeEl && activeEl.tagName === 'TEXTAREA') {
                   const start = activeEl.selectionStart;
                   const end = activeEl.selectionEnd;
                   const newContent = note.content.substring(0, start) + imageMarkdown + note.content.substring(end);
                   handleChange(newContent);
                } else {
                   handleChange(note.content + imageMarkdown);
                }
              }
            } catch (err) { console.error('Failed to save image:', err); }
          }
        }
        break;
      }
    }
  };

  const highlight = (code: string) => {
    let lang: string = note.language;
    if (lang === 'text') return code; 
    if (lang === 'html') lang = 'markup';
    if (Prism.languages[lang]) {
      return Prism.highlight(code, Prism.languages[lang], lang);
    }
    return code;
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 transition-colors duration-300`}>
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 flex-1 no-drag">
          <input
            name="title"
            type="text"
            value={note.title}
            onChange={handleTitleChange}
            placeholder="笔记标题..."
            className="bg-transparent text-xl font-bold focus:outline-none w-full max-w-xl text-zinc-800 dark:text-zinc-100 no-drag"
          />
        </div>
        <div className="flex items-center gap-2 no-drag">
          <select
            value={note.language}
            onChange={(e) => onUpdateNote(note.id, { language: e.target.value as Language })}
            className="bg-zinc-100 dark:bg-zinc-900 text-xs px-2.5 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 outline-none cursor-pointer appearance-none text-zinc-600 dark:text-zinc-400"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
          <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-2" />
          <button onClick={onSave} data-tooltip="保存 (Ctrl + S)" className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Save size={18} /></button>
          <button onClick={handleTogglePin} data-tooltip={note.isPinned ? "取消笔记置顶" : "置顶笔记"} className={`p-2 rounded-lg transition-colors ${note.isPinned ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>{note.isPinned ? <Pin size={18} fill="currentColor" /> : <PinOff size={18} />}</button>
          {viewState === 'floating' && (
            <button 
              onClick={onToggleWindowTop} 
              data-tooltip={isWindowOnTop ? "取消窗口置顶" : "窗口置顶"} 
              className={`p-2 rounded-lg transition-colors ${isWindowOnTop ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              <ArrowUpToLine size={18} />
            </button>
          )}
          <button 
            onClick={() => setViewState(viewState === 'standard' ? 'floating' : 'standard')} 
            data-tooltip={viewState === 'standard' ? '分离为独立窗口' : '关闭此窗口'} 
            className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {viewState === 'standard' ? <ExternalLink size={18} /> : <X size={18} />}
          </button>
          <button 
            onClick={() => onDeleteNote(note.id)} 
            data-tooltip="删除笔记" 
            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-zinc-50 dark:border-zinc-900/50 flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth shrink-0 no-drag">
        {isAddingTag ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-blue-500/50">
            <HashIcon size={10} className="text-zinc-400" />
            <input 
              ref={tagInputRef} 
              type="text" 
              value={newTagValue} 
              onChange={(e) => setNewTagValue(e.target.value)} 
              onKeyDown={handleKeyDownTag} 
              onBlur={handleSubmitTag} 
              placeholder="输入标签..." 
              className="w-20 bg-transparent text-xs outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 no-drag"
            />
          </div>
        ) : (
          <button 
            onClick={handleStartAddTag} 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-zinc-400 hover:text-blue-600 transition-all uppercase tracking-wider whitespace-nowrap"
          >
            <PlusIcon size={12} /> 添加标签
          </button>
        )}
        {note.tags.map(tag => (
          <span key={tag} className={`group ${getTagStyle(tag)}`}>
            {tag}
            <button 
              onClick={() => handleRemoveTag(tag)} 
              className="w-0 p-0 overflow-hidden opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1 group-hover:p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-sm transition-all duration-200 ease-in-out"
            >
              <Trash2 size={10} />
            </button>
          </span>
        ))}
      </div>

      <div className="flex-1 relative overflow-auto editor-container no-drag" onPaste={handlePaste}>
        <Editor
          value={note.content}
          onValueChange={handleChange}
          highlight={highlight}
          padding={32}
          className="font-mono text-sm leading-relaxed no-drag"
          textareaClassName="focus:outline-none no-drag"
          style={{
            fontFamily: '"Fira Code", "Consolas", monospace',
            fontSize: 14,
            minHeight: '100%',
          }}
        />
      </div>
      
      <div className="px-6 py-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-[10px] text-zinc-400 uppercase tracking-widest font-medium shrink-0">
        <div className="flex items-center gap-4">
          <span>修改时间：{new Date(note.updatedAt).toLocaleString('zh-CN')}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{note.content.length} 字符</span>
          <span>{note.content.split(/\s+/).filter(Boolean).length} 词</span>
          <span className="text-blue-500">{LANGUAGES.find(l => l.value === note.language)?.label || '纯文本'}</span>
        </div>
      </div>
    </div>
  );
});

// 使用memo优化，避免不必要的重新渲染
EditorComponent.displayName = 'EditorComponent';

export default EditorComponent;