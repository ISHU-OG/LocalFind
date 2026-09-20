import { useState } from 'react';
import {
  User,
  Store,
  ChevronRight,
  Ticket,
  Bookmark,
  MapPin,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import type { CodeWithShop } from '@/lib/types';
import { CATEGORIES } from '@/lib/constants';

interface ProfileScreenProps {
  uid: string;
  displayName?: string;
  email?: string | null;
  isGuest?: boolean;
  isShopkeeper: boolean;
  onSwitchMode: (isShopkeeper: boolean) => void;
  codes: CodeWithShop[];
  savedCount: number;
  onCodeClick: (code: CodeWithShop) => void;
  onBackToShopper: () => void;
  onSignOut?: () => void;
}

export default function ProfileScreen({
  uid,
  displayName,
  email,
  isGuest,
  isShopkeeper,
  onSwitchMode,
  codes,
  savedCount,
  onCodeClick,
  onBackToShopper,
  onSignOut,
}: ProfileScreenProps) {
  const [showCodes, setShowCodes] = useState(false);

  const activeCodes = codes.filter((c) => c.status === 'active');
  const confirmedCodes = codes.filter((c) => c.status === 'confirmed');

  if (showCodes) {
    return (
      <div className="h-full overflow-y-auto bg-white pb-20">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setShowCodes(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">My Codes</h1>
        </div>

        <div className="px-4 py-4 space-y-3">
          {codes.length === 0 ? (
            <div className="text-center py-16">
              <Ticket size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No codes generated yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Generate a discount code from any shop's detail page.
              </p>
            </div>
          ) : (
            <>
              {activeCodes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Active
                  </p>
                  {activeCodes.map((code) => (
                    <CodeListItem key={code.id} code={code} onClick={() => onCodeClick(code)} />
                  ))}
                </div>
              )}
              {confirmedCodes.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Confirmed
                  </p>
                  {confirmedCodes.map((code) => (
                    <CodeListItem key={code.id} code={code} onClick={() => onCodeClick(code)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-20">
      <div className="bg-white px-5 pt-6 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <User size={26} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {displayName?.trim() || (isShopkeeper ? 'Shopkeeper' : 'Shopper')}
            </h1>
            {isGuest ? (
              <p className="text-xs text-amber-600 font-medium">Browsing as guest</p>
            ) : email ? (
              <p className="text-xs text-slate-400">{email}</p>
            ) : (
              <p className="text-xs text-slate-400 font-mono">{uid.slice(0, 8)}...</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl overflow-hidden">
          {!isShopkeeper && (
            <>
              <button
                onClick={() => setShowCodes(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Ticket size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900">My Codes</p>
                  <p className="text-xs text-slate-500">
                    {activeCodes.length} active, {confirmedCodes.length} confirmed
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
              <div className="h-px bg-slate-100 mx-4" />
              <div className="w-full flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Bookmark size={18} className="text-amber-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900">Saved Shops</p>
                  <p className="text-xs text-slate-500">{savedCount} shops bookmarked</p>
                </div>
              </div>
            </>
          )}
          {isShopkeeper && (
            <div className="w-full flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Store size={18} className="text-emerald-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">Shopkeeper Mode</p>
                <p className="text-xs text-slate-500">Manage your shop and confirm codes</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl overflow-hidden mt-4">
          <button
            onClick={() => {
              if (isShopkeeper) {
                onBackToShopper();
              }
              onSwitchMode(!isShopkeeper);
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              {isShopkeeper ? <MapPin size={18} className="text-slate-600" /> : <Store size={18} className="text-slate-600" />}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900">
                {isShopkeeper ? 'Switch to Shopper' : 'Switch to Shopkeeper'}
              </p>
              <p className="text-xs text-slate-500">
                {isShopkeeper ? 'Browse and discover shops' : 'Register and manage your shop'}
              </p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        </div>

        {onSignOut && (
          <div className="bg-white rounded-2xl overflow-hidden mt-4">
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <LogOut size={18} className="text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-600">
                  {isGuest ? 'Exit guest mode' : 'Sign out'}
                </p>
              </div>
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">LocalFind v1.0</p>
          <p className="text-xs text-slate-400 mt-0.5">Discover local. Shop smart.</p>
        </div>
      </div>
    </div>
  );
}

function CodeListItem({
  code,
  onClick,
}: {
  code: CodeWithShop;
  onClick: () => void;
}) {
  const cat = CATEGORIES[code.shop.category] || CATEGORIES.other;
  const isExpired = new Date(code.expires_at).getTime() < Date.now() && code.status === 'active';
  const statusColor =
    code.status === 'confirmed'
      ? 'bg-emerald-50 text-emerald-700'
      : isExpired
        ? 'bg-red-50 text-red-700'
        : 'bg-blue-50 text-blue-700';
  const statusText = code.status === 'confirmed' ? 'Confirmed' : isExpired ? 'Expired' : 'Active';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3 mb-2 hover:shadow-sm transition-shadow text-left"
    >
      <div className={`w-10 h-10 rounded-lg ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
        <cat.icon size={16} className={cat.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{code.shop.name}</p>
        <p className="text-xs text-slate-500 font-mono">{code.code}</p>
      </div>
      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${statusColor} flex-shrink-0`}>
        {statusText}
      </span>
    </button>
  );
}
