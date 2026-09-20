import { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Ticket,
  CheckCircle2,
  Clock,
  TrendingUp,
  Pencil,
  Loader2,
  QrCode,
} from 'lucide-react';
import type { ShopWithOffer, Code } from '@/lib/types';
import { CATEGORIES } from '@/lib/constants';
import { subscribeOwnerShops, subscribeOwnerCodes } from '@/lib/api';
import ShopForm from '@/components/ShopForm';
import ConfirmCode from '@/screens/ConfirmCode';
import EmptyState from '@/components/EmptyState';

interface DashboardProps {
  ownerUid: string;
}

export default function Dashboard({ ownerUid }: DashboardProps) {
  const [shops, setShops] = useState<ShopWithOffer[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopWithOffer | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedShop, setSelectedShop] = useState<ShopWithOffer | null>(null);

  useEffect(() => {
    if (!ownerUid) return;
    setShopsLoading(true);
    const unsub = subscribeOwnerShops(
      ownerUid,
      (data) => {
        setShops(data);
        setShopsLoading(false);
      },
      (err) => {
        console.error('Failed to load your shops:', err);
        setShopsLoading(false);
      }
    );
    return unsub;
  }, [ownerUid]);

  useEffect(() => {
    if (!ownerUid) return;
    const unsub = subscribeOwnerCodes(
      ownerUid,
      (data) => setCodes(data),
      (err) => console.error('Failed to load codes:', err)
    );
    return unsub;
  }, [ownerUid]);

  const handleSaved = () => {
    setShowForm(false);
    setEditingShop(null);
  };

  const handleEdit = (shop: ShopWithOffer) => {
    setEditingShop(shop);
    setShowForm(true);
  };

  const handleConfirmCodes = (shop: ShopWithOffer) => {
    setSelectedShop(shop);
    setShowConfirm(true);
  };

  if (shopsLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50 pb-20">
        <div className="px-4 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        </div>
        <EmptyState
          icon={Store}
          title="No shops registered"
          message="Register your shop to start offering discounts and confirming codes from shoppers."
          actionLabel="Register Your Shop"
          onAction={() => setShowForm(true)}
        />
        {showForm && (
          <ShopForm ownerUid={ownerUid} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your shops and offers</p>
      </div>

      <div className="px-4 space-y-4">
        {shops.map((shop) => {
          const cat = CATEGORIES[shop.category] || CATEGORIES.other;
          const Icon = cat.icon;
          const shopCodes = codes.filter((c) => c.shop_id === shop.id);
          const activeCodes = shopCodes.filter((c) => c.status === 'active');
          const confirmedCodes = shopCodes.filter((c) => c.status === 'confirmed');
          const todayConfirmed = confirmedCodes.filter((c) => {
            if (!c.confirmed_at) return false;
            const today = new Date();
            const confirmed = new Date(c.confirmed_at);
            return (
              confirmed.getDate() === today.getDate() &&
              confirmed.getMonth() === today.getMonth() &&
              confirmed.getFullYear() === today.getFullYear()
            );
          });
          const activeOffer = shop.offers?.find((o) => o.is_active);

          return (
            <div key={shop.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="relative h-28 bg-slate-200">
                {shop.image_url ? (
                  <img
                    src={shop.image_url}
                    alt={shop.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`h-full w-full ${cat.bgColor} flex items-center justify-center`}>
                    <Icon size={36} className={cat.color} />
                  </div>
                )}
                <button
                  onClick={() => handleEdit(shop)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Pencil size={14} className="text-slate-700" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{shop.name}</h3>
                    <div className={`inline-flex items-center gap-1 ${cat.bgColor} px-2 py-0.5 rounded-full mt-1`}>
                      <Icon size={10} className={cat.color} />
                      <span className={`text-xs font-medium ${cat.color}`}>{cat.label}</span>
                    </div>
                  </div>
                  {activeOffer && (
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">
                        {activeOffer.discount_type === 'percentage'
                          ? `${activeOffer.discount_value}%`
                          : `Rs. ${activeOffer.discount_value}`}
                      </div>
                      <div className="text-xs text-slate-400">OFF</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <StatBox
                    icon={Clock}
                    label="Pending"
                    value={activeCodes.length}
                    color="text-blue-600"
                    bg="bg-blue-50"
                  />
                  <StatBox
                    icon={CheckCircle2}
                    label="Today"
                    value={todayConfirmed.length}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                  />
                  <StatBox
                    icon={TrendingUp}
                    label="Total"
                    value={confirmedCodes.length}
                    color="text-slate-600"
                    bg="bg-slate-100"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmCodes(shop)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all"
                  >
                    <QrCode size={16} />
                    Confirm Codes
                    {activeCodes.length > 0 && (
                      <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {activeCodes.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => {
            setEditingShop(null);
            setShowForm(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-medium hover:border-slate-400 hover:text-slate-600 transition-colors"
        >
          <Plus size={18} />
          Add Another Shop
        </button>
      </div>

      {showForm && (
        <ShopForm
          ownerUid={ownerUid}
          existingShop={editingShop}
          onSaved={handleSaved}
          onCancel={() => {
            setShowForm(false);
            setEditingShop(null);
          }}
        />
      )}

      {showConfirm && selectedShop && (
        <ConfirmCode
          shop={selectedShop}
          onClose={() => {
            setShowConfirm(false);
            setSelectedShop(null);
          }}
        />
      )}
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Ticket;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-2.5 text-center`}>
      <Icon size={16} className={`${color} mx-auto mb-1`} />
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
