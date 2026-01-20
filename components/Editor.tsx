/**
 * Editor.tsx - 笔记编辑器组件
 * 
 * 功能：
 * 1. 显示和编辑笔记内容
 * 2. 支持语法高亮
 * 3. 支持添加和删除标签
 * 4. 支持粘贴图片
 * 5. 支持将笔记分离为独立窗口
 * 6. 支持置顶/取消置顶笔记
 * 7. 显示笔记统计信息（修改时间、字符数、词数等）
 */

import React, { useState, useRef, useEffect, memo } from 'react';
// 导入图标组件
import { Trash2, Pin, PinOff, Tag as TagIcon, ExternalLink, Hash as HashIcon, Plus as PlusIcon, Save, ArrowUpToLine } from 'lucide-react';
// 导入代码编辑器组件
import Editor from 'react-simple-code-editor';
// 导入语法高亮库
import Prism from 'prismjs';
// 导入各种语言的语法高亮支持
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

// 导入类型定义
import { Note, Language } from '../types';
// 导入语言列表常量
import { LANGUAGES } from '../constants';
// 导入工具函数
import { getTagStyle } from '../utils';

/**
 * EditorProps - 编辑器组件的属性接口
 * 
 * 属性：
 * - note: 当前编辑的笔记对象，null表示没有选中笔记
 * - onUpdateNote: 更新笔记的回调函数
 * - onDeleteNote: 删除笔记的回调函数
 * - onSave: 保存笔记的回调函数
 * - onPinNote: 置顶/取消置顶笔记的回调函数
 * - viewState: 视图状态，'standard'表示标准视图，'floating'表示浮动窗口
 * - setViewState: 设置视图状态的回调函数
 * - isWindowOnTop: 窗口是否置顶
 * - onToggleWindowTop: 切换窗口置顶状态的回调函数
 * - settings: 应用设置对象
 */
interface EditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onSave: () => void;
  onTogglePin: (id: string) => void;
  viewState: 'standard' | 'floating';
  setViewState: (v: 'standard' | 'floating') => void;
  isWindowOnTop: boolean;
  onToggleWindowTop: () => void;
  settings: any;
}

/**
 * EditorComponent - 笔记编辑器组件
 * 
 * 使用memo优化，避免不必要的重新渲染
 */
const EditorComponent: React.FC<EditorProps> = memo(({ 
  note, 
  onUpdateNote, 
  onDeleteNote, 
  onSave, 
  onTogglePin,
  viewState, 
  setViewState, 
  isWindowOnTop,
  onToggleWindowTop,
  settings
}) => {
  // 状态管理
  // isAddingTag: 是否正在添加标签
  const [isAddingTag, setIsAddingTag] = useState(false);
  // newTagValue: 新标签的值
  const [newTagValue, setNewTagValue] = useState('');
  // tagInputRef: 标签输入框的引用
  const tagInputRef = useRef<HTMLInputElement>(null);

  /**
   * useEffect钩子 - 当isAddingTag变化时，聚焦到标签输入框
   */
  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isAddingTag]);

  /**
   * 无笔记时的空状态显示
   */
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

  /**
   * 处理内容变化
   * @param newContent 新的笔记内容
   */
  const handleChange = (newContent: string) => {
    onUpdateNote(note.id, { content: newContent, updatedAt: Date.now() });
  };

  /**
   * 处理标题变化
   * @param e 输入事件对象
   */
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote(note.id, { title: e.target.value, updatedAt: Date.now() });
  };

  /**
   * 处理置顶/取消置顶笔记
   */
  const handleTogglePin = () => {
    onTogglePin(note.id);
  };

  /**
   * 开始添加标签
   */
  const handleStartAddTag = () => {
    setIsAddingTag(true);
    setNewTagValue('');
  };

  /**
   * 提交添加标签
   */
  const handleSubmitTag = () => {
    const tag = newTagValue.trim();
    if (tag && !note.tags.includes(tag)) {
      onUpdateNote(note.id, { tags: [...note.tags, tag], updatedAt: Date.now() });
    }
    setIsAddingTag(false);
    setNewTagValue('');
  };

  /**
   * 处理标签输入框的键盘事件
   * @param e 键盘事件对象
   */
  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitTag();
    } else if (e.key === 'Escape') {
      setIsAddingTag(false);
    }
  };

  /**
   * 处理删除标签
   * @param tagToRemove 要删除的标签
   */
  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote(note.id, { 
      tags: note.tags.filter(t => t !== tagToRemove),
      updatedAt: Date.now() 
    });
  };

  /**
   * 处理粘贴事件 - 支持粘贴图片
   * @param e 粘贴事件对象
   */
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
              // 通过IPC调用保存图片
              const imageUrl = await ipcRenderer.invoke('save-image', {
                name: file.name || 'image.png',
                data: buffer
              });
              if (imageUrl) {
                // 生成图片的Markdown语法
                const imageMarkdown = `\n![Image](${imageUrl})\n`;
                const activeEl = document.activeElement as HTMLTextAreaElement;
                if (activeEl && activeEl.tagName === 'TEXTAREA') {
                  // 插入图片到光标位置
                   const start = activeEl.selectionStart;
                   const end = activeEl.selectionEnd;
                   const newContent = note.content.substring(0, start) + imageMarkdown + note.content.substring(end);
                   handleChange(newContent);
                } else {
                  // 追加图片到内容末尾
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

  /**
   * 语法高亮函数
   * @param code 要高亮的代码
   * @returns 高亮后的代码
   */
  const highlight = (code: string) => {
    let lang: string = note.language;
    if (lang === 'text') return code; 
    if (lang === 'html') lang = 'markup';
    if (Prism.languages[lang]) {
      return Prism.highlight(code, Prism.languages[lang], lang);
    }
    return code;
  };

  /**
   * 渲染编辑器界面
   */
  return (
    <div className={`flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 transition-colors duration-300`}>
      {/* 标题栏部分 */}
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 flex-1 no-drag">
          {/* 笔记标题输入框 */}
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
          {/* 语言选择下拉框 */}
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
          {/* 保存按钮 */}
          <button onClick={onSave} data-tooltip="保存 (Ctrl + S)" className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Save size={18} /></button>
          {/* 置顶/取消置顶按钮 */}
          {viewState !== 'floating' && (<button onClick={handleTogglePin} data-tooltip={note.isPinned ? "取消笔记置顶" : "置顶笔记"} className={`p-2 rounded-lg transition-colors ${note.isPinned ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><ArrowUpToLine size={18} /></button>)}
          {/* 窗口置顶按钮（仅在浮动窗口显示） */}
          {viewState === 'floating' && (
            <button 
              onClick={onToggleWindowTop} 
              data-tooltip={isWindowOnTop ? "取消窗口置顶" : "窗口置顶"} 
              className={`p-2 rounded-lg transition-colors ${isWindowOnTop ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              {isWindowOnTop ? <Pin size={18} fill="currentColor" /> : <PinOff size={18} />}
            </button>
          )}
          {/* 分离/关闭窗口按钮 */}
          {viewState === 'standard' && (<button 
            onClick={() => setViewState(viewState === 'standard' ? 'floating' : 'standard')} 
            data-tooltip={viewState === 'standard' ? '分离为独立窗口' : '关闭此窗口'} 
            className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ExternalLink size={18} />
          </button>)}
          {/* 删除笔记按钮 */}
          <button 
            onClick={() => onDeleteNote(note.id)} 
            data-tooltip="删除笔记" 
            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* 标签栏部分 */}
      <div className="px-6 py-2 border-b border-zinc-50 dark:border-zinc-900/50 flex flex-wrap items-center gap-3 shrink-0 no-drag">
        {/* 添加标签输入框或按钮 */}
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
        {/* 已添加的标签列表 */}
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

      {/* 编辑器主体部分 */}
      <div className="flex-1 relative overflow-auto scrollbar-overlay editor-container no-drag" onPaste={handlePaste} onDrop={(e) => e.preventDefault()} onDragOver={(e) => e.preventDefault()}>
        <Editor
          value={note.content}
          onValueChange={handleChange}
          highlight={highlight}
          padding={32}
          className="font-mono leading-relaxed no-drag"
          textareaClassName="focus:outline-none no-drag"
          style={{
            fontFamily: '"Fira Code", "Consolas", monospace',
            fontSize: `${settings.fontSize}px`,
            minHeight: '100%',
          }}
        />
      </div>
      
      {/* 状态栏部分 */}
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

/**
 * 使用memo优化，避免不必要的重新渲染
 */
EditorComponent.displayName = 'EditorComponent';

export default EditorComponent;