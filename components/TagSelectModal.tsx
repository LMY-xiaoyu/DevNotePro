
import React from 'react';
import { X } from 'lucide-react';
import { getTagStyle } from '../utils';

interface TagSelectModalProps {
  isOpen: boolean;
  tags: string[];
  onSelect: (tag: string) => void;
  onClose: () => void;
}

const TagSelectModal: React.FC<TagSelectModalProps> = ({ isOpen, tags, onSelect, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">添加标签</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-2">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    onSelect(tag);
                    onClose();
                  }}
                  className={getTagStyle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-zinc-400 text-sm">
              暂无可用标签
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagSelectModal;
