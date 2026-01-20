
// Pastel palette: Pink, Red, Orange, Green, Cyan, Blue, Purple
// Light background, colored text, subtle border
const TAG_COLORS = [
  'bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/20',
  'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
  'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20',
  'bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20',
  'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20',
  'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20',
];

export const getTagStyle = (tag: string, isActive: boolean = false) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
  
  // Style: Pastel bg, darker text, border, rounded corners, whitespace-nowrap
  const base = `inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-medium transition-all select-none border whitespace-nowrap ${colorClass}`;
  
  if (isActive) {
    // Active state with highlight instead of ring
    return `${base} opacity-100 scale-105 font-bold shadow-md`;
  }
  
  return `${base} hover:opacity-80`;
};
