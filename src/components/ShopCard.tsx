import { Bookmark, MapPin } from 'lucide-react';
import type { ShopWithOffer } from '@/lib/types';
import { CATEGORIES } from '@/lib/constants';
import { haversineDistance, formatDistance } from '@/lib/geo';
import { getOpenStatus } from '@/lib/shopHours';

interface ShopCardProps {
  shop: ShopWithOffer;
  userLat: number;
  userLng: number;
  isSaved: boolean;
  onClick: () => void;
  onToggleSave: () => void;
}

export default function ShopCard({
  shop,
  userLat,
  userLng,
  isSaved,
  onClick,
  onToggleSave,
}: ShopCardProps) {
  const cat = CATEGORIES[shop.category] || CATEGORIES.other;
  const Icon = cat.icon;
  const distance = haversineDistance(userLat, userLng, shop.latitude, shop.longitude);
  const activeOffer = shop.offers?.find((o) => o.is_active);
  const status = getOpenStatus(shop.opening_hours);
  const isNew = Date.now() - new Date(shop.created_at).getTime() < 3 * 24 * 60 * 60 * 1000;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] transition-transform"
    >
      <div className="relative h-32 bg-slate-200">
        {shop.image_url ? (
          <img
            src={shop.image_url}
            alt={shop.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className={`h-full w-full ${cat.bgColor} flex items-center justify-center`}>
            <Icon size={40} className={cat.color} />
          </div>
        )}
        <div className={`absolute top-2 left-2 ${cat.bgColor} px-2.5 py-1 rounded-full flex items-center gap-1`}>
          <Icon size={12} className={cat.color} />
          <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
        </div>
        <div
          className={`absolute top-2 right-10 px-2 py-1 rounded-full text-[10px] font-semibold ${
            status.isOpen
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-600 text-white'
          }`}
        >
          {status.isOpen ? 'Open' : 'Closed'}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          <Bookmark
            size={16}
            className={isSaved ? 'text-blue-600 fill-blue-600' : 'text-slate-500'}
          />
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-slate-900 text-sm truncate">{shop.name}</h3>
        {shop.address && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{shop.address}</p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <MapPin size={12} className="text-slate-400" />
          <span className="text-xs text-slate-500">{formatDistance(distance)} away</span>
        </div>
        {activeOffer && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {activeOffer.discount_type === 'percentage'
                ? `${activeOffer.discount_value}% OFF`
                : `Rs. ${activeOffer.discount_value} OFF`}
            </span>
            {isNew && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                New
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
