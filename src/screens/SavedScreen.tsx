import { useMemo } from 'react';
import { Bookmark, Loader2, Store } from 'lucide-react';
import ShopCard from '@/components/ShopCard';
import EmptyState from '@/components/EmptyState';
import type { ShopWithOffer } from '@/lib/types';
import { haversineDistance } from '@/lib/geo';

interface SavedScreenProps {
  shops: ShopWithOffer[];
  savedShopIds: string[];
  userLat: number;
  userLng: number;
  loading: boolean;
  onShopClick: (shop: ShopWithOffer) => void;
  onToggleSave: (shopId: string) => void;
}

export default function SavedScreen({
  shops,
  savedShopIds,
  userLat,
  userLng,
  loading,
  onShopClick,
  onToggleSave,
}: SavedScreenProps) {
  const savedShops = useMemo(() => {
    return shops
      .filter((s) => savedShopIds.includes(s.id))
      .map((s) => ({
        shop: s,
        dist: haversineDistance(userLat, userLng, s.latitude, s.longitude),
      }))
      .sort((a, b) => a.dist - b.dist);
  }, [shops, savedShopIds, userLat, userLng]);

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-4 pt-4 pb-2 border-b border-slate-100 bg-white">
        <h1 className="text-2xl font-bold text-slate-900">Saved Shops</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {savedShops.length} saved {savedShops.length === 1 ? 'shop' : 'shops'}
        </p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-slate-400" />
          </div>
        ) : savedShops.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No saved shops yet"
            message="Tap the bookmark icon on any shop to save it for quick access later."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {savedShops.map(({ shop }) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                userLat={userLat}
                userLng={userLng}
                isSaved={true}
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
