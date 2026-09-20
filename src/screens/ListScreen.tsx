import { useMemo, useState } from 'react';
import { Search, Loader2, Store, ArrowUpDown } from 'lucide-react';
import ShopCard from '@/components/ShopCard';
import CategoryFilter from '@/components/CategoryFilter';
import RadiusSlider from '@/components/RadiusSlider';
import EmptyState from '@/components/EmptyState';
import type { ShopWithOffer } from '@/lib/types';
import { haversineDistance } from '@/lib/geo';

type SortMode = 'distance' | 'name' | 'discount';

interface ListScreenProps {
  shops: ShopWithOffer[];
  userLat: number;
  userLng: number;
  loading: boolean;
  selectedCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  savedShopIds: string[];
  onShopClick: (shop: ShopWithOffer) => void;
  onToggleSave: (shopId: string) => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
}

const SORT_LABELS: Record<SortMode, string> = {
  distance: 'Nearest',
  name: 'Name A-Z',
  discount: 'Best Discount',
};

export default function ListScreen({
  shops,
  userLat,
  userLng,
  loading,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  savedShopIds,
  onShopClick,
  onToggleSave,
  radiusKm,
  onRadiusChange,
}: ListScreenProps) {
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortedShops = useMemo(() => {
    const filtered = shops.filter((shop) => {
      if (selectedCategory && shop.category !== selectedCategory) return false;
      if (searchQuery && !shop.name.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      if (haversineDistance(userLat, userLng, shop.latitude, shop.longitude) > radiusKm)
        return false;
      return true;
    });

    const withMeta = filtered.map((s) => {
      const offer = s.offers?.find((o) => o.is_active);
      const discountScore = offer
        ? offer.discount_type === 'percentage'
          ? offer.discount_value
          : offer.discount_value / 10
        : 0;
      return {
        shop: s,
        dist: haversineDistance(userLat, userLng, s.latitude, s.longitude),
        discountScore,
      };
    });

    if (sortMode === 'distance') {
      withMeta.sort((a, b) => a.dist - b.dist);
    } else if (sortMode === 'name') {
      withMeta.sort((a, b) => a.shop.name.localeCompare(b.shop.name));
    } else {
      withMeta.sort((a, b) => b.discountScore - a.discountScore);
    }

    return withMeta;
  }, [shops, selectedCategory, searchQuery, userLat, userLng, sortMode, radiusKm]);

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="sticky top-0 bg-white z-10 border-b border-slate-100">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-slate-900">All Shops</h1>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600"
              >
                <ArrowUpDown size={13} />
                {SORT_LABELS[sortMode]}
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 min-w-[140px] z-20 animate-scale-in">
                  {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setSortMode(mode);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                        sortMode === mode ? 'text-blue-600 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {SORT_LABELS[mode]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <CategoryFilter selected={selectedCategory} onChange={onCategoryChange} />
        <div className="px-4 pb-3">
          <RadiusSlider radiusKm={radiusKm} onChange={onRadiusChange} />
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-slate-400" />
          </div>
        ) : sortedShops.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No shops found"
            message="Try changing your search or category filter."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedShops.map(({ shop }) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                userLat={userLat}
                userLng={userLng}
                isSaved={savedShopIds.includes(shop.id)}
                onClick={() => onShopClick(shop)}
                onToggleSave={() => onToggleSave(shop.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
