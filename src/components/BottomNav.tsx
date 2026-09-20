import { Map, List, Bookmark, User, Store } from 'lucide-react';

export type Tab = 'map' | 'list' | 'saved' | 'profile' | 'dashboard';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  isShopkeeper: boolean;
}

const SHOPPER_TABS: { key: Tab; label: string; icon: typeof Map }[] = [
  { key: 'map', label: 'Map', icon: Map },
  { key: 'list', label: 'List', icon: List },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'profile', label: 'Profile', icon: User },
];

const SHOPKEEPER_TABS: { key: Tab; label: string; icon: typeof Map }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Store },
  { key: 'profile', label: 'Profile', icon: User },
];

export default function BottomNav({ active, onChange, isShopkeeper }: BottomNavProps) {
  const tabs = isShopkeeper ? SHOPKEEPER_TABS : SHOPPER_TABS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-bottom">
      <div className="mx-auto max-w-md flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex flex-col items-center gap-1 px-4 py-1.5 transition-colors"
            >
              <Icon
                size={22}
                className={isActive ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
