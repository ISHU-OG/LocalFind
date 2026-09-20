import { useMemo } from 'react';
import { Search, Navigation, Loader2 } from 'lucide-react';
import MapView from '@/components/MapView';
import CategoryFilter from '@/components/CategoryFilter';
import RadiusSlider from '@/components/RadiusSlider';
import type { ShopWithOffer } from '@/lib/types';
import { haversineDistance } from '@/lib/geo';

interface MapScreenProps {
  shops: ShopWithOffer[];
  userLat: number;
  userLng: number;
  loading: boolean;
  selectedCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onMarkerClick: (shop: ShopWithOffer) => void;
  selectedShopId?: string;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
}

export default function MapScreen({
  shops,
  userLat,
  userLng,
  loading,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onMarkerClick,
  selectedShopId,
  radiusKm,
  onRadiusChange,
}: MapScreenProps) {
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      if (selectedCategory && shop.category !== selectedCategory) return false;
      if (searchQuery && !shop.name.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      if (haversineDistance(userLat, userLng, shop.latitude, shop.longitude) > radiusKm)
        return false;
      return true;
    });
  }, [shops, selectedCategory, searchQuery, userLat, userLng, radiusKm]);

  const nearest = useMemo(() => {
    if (filteredShops.length === 0) return null;
    const withDistance = filteredShops.map((s) => ({
      shop: s,
      dist: haversineDistance(userLat, userLng, s.latitude, s.longitude),
    }));
    withDistance.sort((a, b) => a.dist - b.dist);
    return withDistance[0];
  }, [filteredShops, userLat, userLng]);

  return (
    <div className="relative h-full">
      {/* z-0 + isolate create a stacking context so Leaflet's internal z-indexes
          (panes 200-700, controls up to 1000) can't escape and cover the UI. */}
      <div className="absolute inset-0 z-0 isolate">
        {loading ? (
          <div className="flex items-center justify-center h-full bg-slate-100">
            <Loader2 size={28} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <MapView
            shops={filteredShops}
            userLat={userLat}
            userLng={userLng}
            onMarkerClick={onMarkerClick}
            selectedShopId={selectedShopId}
          />
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 pt-4 px-4 pointer-events-none">
        <div className="relative pointer-events-auto">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search shops..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white shadow-md border border-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-3 pointer-events-auto">
          <CategoryFilter selected={selectedCategory} onChange={onCategoryChange} />
        </div>
        <div className="mt-2 pointer-events-auto bg-white/95 backdrop-blur rounded-xl shadow-md border border-slate-100 px-3 py-2">
          <RadiusSlider radiusKm={radiusKm} onChange={onRadiusChange} />
        </div>
      </div>

      {nearest && !loading && (
        <button
          onClick={() => onMarkerClick(nearest.shop)}
          className="absolute bottom-24 left-4 right-4 z-10 bg-white rounded-2xl shadow-lg p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Navigation size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">Nearest shop</p>
            <p className="font-semibold text-sm text-slate-900 truncate">{nearest.shop.name}</p>
          </div>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">
            {nearest.dist < 1
              ? `${Math.round(nearest.dist * 1000)} m`
              : `${nearest.dist.toFixed(1)} km`}
          </span>
        </button>
      )}
    </div>
  );
}
