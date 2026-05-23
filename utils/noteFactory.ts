import { Note } from '../types';

export const createNote = (folderId = 'all'): Note => ({
  id: crypto.randomUUID(),
  title: '',
  content: '',
  tags: [],
  folderId,
  language: 'text',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isArchived: false,
  isPinned: false,
});

export const createFallbackNote = (id: string): Note => ({
  ...createNote('all'),
  id,
});

export const createWelcomeNote = (): Note => ({
  id: 'welcome',
  title: '欢迎使用 DevNote Pro',
  content: `# 全新高性能架构\n\n- **独立文件存储**: 每个笔记现在保存为独立的 JSON 文件。\n- **图片支持**: 直接粘贴图片到编辑器。\n- **原生独立窗口**: 拖拽标签页向下，变为独立系统窗口。`,
  tags: ['版本更新'],
  folderId: 'all',
  language: 'markdown',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isArchived: false,
  isPinned: true,
});
