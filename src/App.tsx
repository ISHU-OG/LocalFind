import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import BottomNav, { type Tab } from '@/components/BottomNav';
import Onboarding from '@/screens/Onboarding';
import AuthScreen from '@/screens/AuthScreen';
import RoleSetup from '@/screens/RoleSetup';
import MapScreen from '@/screens/MapScreen';
import ListScreen from '@/screens/ListScreen';
import SavedScreen from '@/screens/SavedScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import ShopDetail from '@/screens/ShopDetail';
import Dashboard from '@/screens/Dashboard';
import CodeReveal from '@/components/CodeReveal';
import { useAuth } from '@/lib/auth';
import { DEFAULT_LOCATION } from '@/lib/constants';
import { subscribeShops, subscribeSavedShops, subscribeShopperCodes, saveShop, unsaveShop } from '@/lib/api';
import type { ShopWithOffer, CodeWithShop, Code, AppUser } from '@/lib/types';

const ONBOARDED_KEY = 'localfind_onboarded';
const MODE_KEY = 'localfind_mode';

export default function App() {
  const { user, profile, loading: authLoading, isGuest, signOut } = useAuth();

  const [onboarded, setOnboarded] = useState<boolean>(
    () => localStorage.getItem(ONBOARDED_KEY) === 'true'
  );

  // Shopkeeper/shopper is a UI mode the person can flip between (e.g. to preview
  // the shopper app while managing a shop). It defaults to the account's role.
  const [modeOverride, setModeOverride] = useState<boolean | null>(() => {
    const stored = localStorage.getItem(MODE_KEY);
    return stored ? stored === 'shopkeeper' : null;
  });
  const isShopkeeper = modeOverride ?? profile?.role === 'shopkeeper';

  const [activeTab, setActiveTab] = useState<Tab>('map');

  const [shops, setShops] = useState<ShopWithOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedShopIds, setSavedShopIds] = useState<string[]>([]);
  const [shopperCodes, setShopperCodes] = useState<CodeWithShop[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);

  const [selectedShop, setSelectedShop] = useState<ShopWithOffer | null>(null);
  const [activeCode, setActiveCode] = useState<CodeWithShop | null>(null);

  const [userLat, setUserLat] = useState(DEFAULT_LOCATION.lat);
  const [userLng, setUserLng] = useState(DEFAULT_LOCATION.lng);

  const uid = user?.uid ?? '';
  const appUser: AppUser | null = user
    ? { uid: user.uid, name: profile?.display_name || user.displayName || 'LocalFind user' }
    : null;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        () => {}
      );
    }
  }, []);

  // Shops are public, so this subscription can start as soon as the app mounts.
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeShops(
      (data) => {
        setShops(data);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load shops:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid || isShopkeeper) return;
    const unsub = subscribeSavedShops(
      uid,
      (ids) => setSavedShopIds(ids),
      (err) => console.error('Failed to load saved shops:', err)
    );
    return unsub;
  }, [uid, isShopkeeper]);

  const [shopperCodesRaw, setShopperCodesRaw] = useState<Code[]>([]);

  useEffect(() => {
    if (!uid || isShopkeeper) return;
    const unsub = subscribeShopperCodes(
      uid,
      (codes) => setShopperCodesRaw(codes),
      (err) => console.error('Failed to load codes:', err)
    );
    return unsub;
  }, [uid, isShopkeeper]);

  // Join codes with their shop so screens keep the CodeWithShop shape they expect.
  useEffect(() => {
    const byId = new Map(shops.map((s) => [s.id, s] as const));
    const joined = shopperCodesRaw
      .map((code) => {
        const shop = byId.get(code.shop_id);
        return shop ? ({ ...code, shop } as CodeWithShop) : null;
      })
      .filter((c): c is CodeWithShop => c !== null);
    setShopperCodes(joined);
  }, [shopperCodesRaw, shops]);

  const handleToggleSave = useCallback(
    async (shopId: string) => {
      if (!uid) return;
      const isSaved = savedShopIds.includes(shopId);
      setSavedShopIds((prev) =>
        isSaved ? prev.filter((id) => id !== shopId) : [...prev, shopId]
      );
      try {
        if (isSaved) {
          await unsaveShop(uid, shopId);
        } else {
          await saveShop(uid, shopId);
        }
      } catch (err) {
        setSavedShopIds((prev) =>
          isSaved ? [...prev, shopId] : prev.filter((id) => id !== shopId)
        );
        console.error('Failed to toggle save:', err);
      }
    },
    [uid, savedShopIds]
  );

  const handleOnboarded = () => {
    setOnboarded(true);
    localStorage.setItem(ONBOARDED_KEY, 'true');
  };

  const handleSwitchMode = (shopkeeper: boolean) => {
    setModeOverride(shopkeeper);
    localStorage.setItem(MODE_KEY, shopkeeper ? 'shopkeeper' : 'shopper');
    setActiveTab(shopkeeper ? 'dashboard' : 'map');
  };

  const handleSignOut = async () => {
    setModeOverride(null);
    localStorage.removeItem(MODE_KEY);
    setSelectedShop(null);
    setActiveCode(null);
    await signOut();
  };

  // --- Auth gates -----------------------------------------------------------

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!onboarded) {
    return <Onboarding onContinue={handleOnboarded} />;
  }

  if (!user || !appUser) {
    return <AuthScreen />;
  }

  if (!isGuest && !profile) {
    return <RoleSetup />;
  }

  // --- Main app ---------------------------------------------------------

  if (selectedShop) {
    return (
      <div className="h-screen">
        <ShopDetail
          shop={selectedShop}
          userLat={userLat}
          userLng={userLng}
          isSaved={savedShopIds.includes(selectedShop.id)}
          onToggleSave={() => handleToggleSave(selectedShop.id)}
          onBack={() => setSelectedShop(null)}
          user={appUser}
        />
        {activeCode && (
          <CodeReveal codeData={activeCode} onDismiss={() => setActiveCode(null)} user={appUser} />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 transition-colors">
      <div className="flex-1 overflow-hidden min-h-0">
        {isShopkeeper ? (
          <>
            {activeTab === 'dashboard' && <Dashboard ownerUid={uid} />}
            {activeTab === 'profile' && (
              <ProfileScreen
                uid={uid}
                displayName={appUser.name}
                email={profile?.email ?? user.email}
                isGuest={isGuest}
                isShopkeeper={isShopkeeper}
                onSwitchMode={handleSwitchMode}
                codes={shopperCodes}
                savedCount={savedShopIds.length}
                onCodeClick={(c) => setActiveCode(c)}
                onBackToShopper={() => {}}
                onSignOut={handleSignOut}
              />
            )}
          </>
        ) : (
          <>
            {activeTab === 'map' && (
              <MapScreen
                shops={shops}
                userLat={userLat}
                userLng={userLng}
                loading={loading}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onMarkerClick={(shop) => setSelectedShop(shop)}
                radiusKm={radiusKm}
                onRadiusChange={setRadiusKm}
              />
            )}
            {activeTab === 'list' && (
              <ListScreen
                shops={shops}
                userLat={userLat}
                userLng={userLng}
                loading={loading}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                savedShopIds={savedShopIds}
                onShopClick={(shop) => setSelectedShop(shop)}
                onToggleSave={handleToggleSave}
                radiusKm={radiusKm}
                onRadiusChange={setRadiusKm}
              />
            )}
            {activeTab === 'saved' && (
              <SavedScreen
                shops={shops}
                savedShopIds={savedShopIds}
                userLat={userLat}
                userLng={userLng}
                loading={loading}
                onShopClick={(shop) => setSelectedShop(shop)}
                onToggleSave={handleToggleSave}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileScreen
                uid={uid}
                displayName={appUser.name}
                email={profile?.email ?? user.email}
                isGuest={isGuest}
                isShopkeeper={isShopkeeper}
                onSwitchMode={handleSwitchMode}
                codes={shopperCodes}
                savedCount={savedShopIds.length}
                onCodeClick={(c) => setActiveCode(c)}
                onBackToShopper={() => {}}
                onSignOut={handleSignOut}
              />
            )}
          </>
        )}
      </div>

      <BottomNav active={activeTab} onChange={setActiveTab} isShopkeeper={isShopkeeper} />

      {activeCode && (
        <CodeReveal codeData={activeCode} onDismiss={() => setActiveCode(null)} user={appUser} />
      )}
    </div>
  );
}
