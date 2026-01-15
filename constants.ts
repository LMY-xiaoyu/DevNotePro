
import { Folder, Language } from './types';

export const DEFAULT_FOLDERS: Folder[] = [
  { id: 'all', name: '全部笔记' },
  { id: 'todo', name: '待办事项' },
  { id: 'code', name: '代码片段' },
  { id: 'debug', name: '调试日志' },
  { id: 'meeting', name: '会议记录' },
  { id: 'archive', name: '归档' },
];

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'text', label: '纯文本' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

export const ACCENT_COLORS = [
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#a855f7' },
  { name: '绿色', value: '#22c55e' },
  { name: '玫瑰色', value: '#f43f5e' },
  { name: '橙色', value: '#f97316' },
];
