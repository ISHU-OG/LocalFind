import { CATEGORIES } from '@/lib/constants';

interface CategoryFilterProps {
  selected: string | null;
  onChange: (cat: string | null) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selected === null
            ? 'bg-slate-900 text-white'
            : 'bg-white text-slate-600 border border-slate-200'
        }`}
      >
        All
      </button>
      {Object.entries(CATEGORIES).map(([key, cfg]) => {
        const Icon = cfg.icon;
        const isSelected = selected === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Icon size={14} className={isSelected ? 'text-white' : cfg.color} />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
