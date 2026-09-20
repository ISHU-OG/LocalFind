import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Bookmark,
  Ticket,
  Loader2,
  Navigation,
  AlertCircle,
  Tag,
  Flag,
  X,
  Star,
} from 'lucide-react';
import type { ShopWithOffer, CodeWithShop, Review, AppUser } from '@/lib/types';
import { CATEGORIES, CODE_EXPIRY_MINUTES } from '@/lib/constants';
import { haversineDistance, formatDistance } from '@/lib/geo';
import { getOpenStatus } from '@/lib/shopHours';
import { generateCode, createReport, fetchReviewsForShop } from '@/lib/api';
import CodeReveal from '@/components/CodeReveal';

const NEW_SHOP_WINDOW_DAYS = 3;

interface ShopDetailProps {
  shop: ShopWithOffer;
  userLat: number;
  userLng: number;
  isSaved: boolean;
  onToggleSave: () => void;
  onBack: () => void;
  user: AppUser;
}

export default function ShopDetail({
  shop,
  userLat,
  userLng,
  isSaved,
  onToggleSave,
  onBack,
  user,
}: ShopDetailProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeData, setCodeData] = useState<CodeWithShop | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  const cat = CATEGORIES[shop.category] || CATEGORIES.other;
  const Icon = cat.icon;
  const distance = haversineDistance(userLat, userLng, shop.latitude, shop.longitude);
  const activeOffer = shop.offers?.find((o) => o.is_active);
  const status = getOpenStatus(shop.opening_hours);
  const isNewShop =
    Date.now() - new Date(shop.created_at).getTime() < NEW_SHOP_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  useEffect(() => {
    fetchReviewsForShop(shop.id)
      .then(setReviews)
      .catch((err) => console.error('Failed to load reviews:', err));
  }, [shop.id]);

  const handleGenerateCode = async () => {
    if (!activeOffer) return;
    setGenerating(true);
    setError(null);
    try {
      const code = await generateCode({
        shop,
        user,
        distanceKm: Number.isFinite(distance) ? distance : null,
      });
      setCodeData({
        ...code,
        shop,
      } as CodeWithShop);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code.');
    } finally {
      setGenerating(false);
    }
  };

  const handleNavigate = () => {
    const url = `https://www.openstreetmap.org/directions?from=${userLat},${userLng}&to=${shop.latitude},${shop.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-full overflow-y-auto bg-white pb-20">
      <div className="relative h-52 bg-slate-200">
        {shop.image_url ? (
          <img src={shop.image_url} alt={shop.name} className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full ${cat.bgColor} flex items-center justify-center`}>
            <Icon size={56} className={cat.color} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <button
          onClick={onToggleSave}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          <Bookmark
            size={18}
            className={isSaved ? 'text-blue-600 fill-blue-600' : 'text-slate-700'}
          />
        </button>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 ${cat.bgColor} px-2.5 py-1 rounded-full`}>
            <Icon size={12} className={cat.color} />
            <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
          </div>
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
              status.isOpen ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-xs font-semibold text-white">{status.label}</span>
          </div>
          {isNewShop && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400">
              <span className="text-xs font-semibold text-slate-900">New</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        <h1 className="text-xl font-bold text-slate-900">{shop.name}</h1>
        {avgRating !== null && (
          <div className="flex items-center gap-1 mt-1">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-semibold text-slate-700">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-slate-400">
              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}

        {shop.address && (
          <p className="text-sm text-slate-500 mt-1 flex items-start gap-1">
            <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            {shop.address}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-slate-500">
            <MapPin size={14} />
            <span className="text-sm">{formatDistance(distance)} away</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Clock size={14} />
            <span className="text-sm">
              {shop.opening_hours?.open} - {shop.opening_hours?.close}
            </span>
          </div>
        </div>
        <p className={`text-xs mt-1 ${status.isOpen ? 'text-emerald-600' : 'text-slate-400'}`}>
          {status.nextLabel}
        </p>

        <button
          onClick={handleNavigate}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
        >
          <Navigation size={16} />
          Get Directions
        </button>

        {activeOffer ? (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
              <Tag size={15} className="text-emerald-600" />
              Active Offer
            </h2>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
              <div className="text-3xl font-bold text-emerald-700">
                {activeOffer.discount_type === 'percentage'
                  ? `${activeOffer.discount_value}% OFF`
                  : `Rs. ${activeOffer.discount_value} OFF`}
              </div>
              <p className="text-sm text-slate-600 mt-1">{activeOffer.description}</p>
              <div className="mt-3 text-xs text-slate-500 bg-white/60 rounded-lg px-3 py-1.5 inline-block">
                Daily limit: {shop.daily_cap} codes
              </div>
            </div>

            {error && (
              <div className="mt-3 bg-red-50 text-red-600 text-sm rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className="mt-3 w-full py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Ticket size={18} />
                  Generate Discount Code
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">
              Code valid for {CODE_EXPIRY_MINUTES} minutes after generation
            </p>
          </div>
        ) : (
          <div className="mt-5 bg-slate-50 rounded-2xl p-6 text-center">
            <Ticket size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No active offers right now</p>
            <p className="text-xs text-slate-400 mt-1">Check back later for discounts</p>
          </div>
        )}

        {codeData && (
          <>
            <CodeReveal
              codeData={codeData}
              onDismiss={() => {
                setCodeData(null);
                fetchReviewsForShop(shop.id).then(setReviews).catch(() => {});
              }}
              onReport={() => setShowReport(true)}
              user={user}
            />
            {showReport && (
              <ReportSheet
                code={codeData}
                reporterUid={user.uid}
                onSubmitted={() => setShowReport(false)}
                onCancel={() => setShowReport(false)}
              />
            )}
          </>
        )}

        {reviews.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <Star size={15} className="text-amber-400" />
              Reviews from verified visits
            </h2>
            <div className="space-y-3">
              {reviews.slice(0, 6).map((r) => (
                <div key={r.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        className={
                          n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                        }
                      />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportSheet({
  code,
  reporterUid,
  onSubmitted,
  onCancel,
}: {
  code: CodeWithShop;
  reporterUid: string;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please describe the issue.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createReport(code, reporterUid, 'dispute', description.trim());
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 animate-slide-up sm:animate-scale-in">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <Flag size={18} className="text-red-500" />
            Report an Issue
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Did the shopkeeper refuse to honor this code? Let us know so we can follow up.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened..."
          rows={4}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />
        {error && (
          <div className="mt-2 bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full mt-4 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
          Submit Report
        </button>
      </div>
    </div>
  );
}
