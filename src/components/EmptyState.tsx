import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
