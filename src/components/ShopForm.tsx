import { useState } from 'react';
import { X, MapPin, Loader2, Camera, Upload, Search, Sparkles } from 'lucide-react';
import { CATEGORY_LIST, DEFAULT_LOCATION } from '@/lib/constants';
import type { ShopWithOffer, Offer } from '@/lib/types';
import { createShop, updateShop, type ShopInput } from '@/lib/api';
import { compressShopPhoto } from '@/lib/imageUtils';
import { geocodeAddress } from '@/lib/geocode';
import { generateShopDescription } from '@/lib/ai';

interface ShopFormProps {
  ownerUid: string;
  existingShop?: ShopWithOffer | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ShopForm({
  ownerUid,
  existingShop,
  onSaved,
  onCancel,
}: ShopFormProps) {
  const isEdit = !!existingShop;
  const existingOffer: Offer | undefined = existingShop?.offers?.find((o) => o.is_active);

  const [name, setName] = useState(existingShop?.name || '');
  const [category, setCategory] = useState(existingShop?.category || 'grocery');
  const [address, setAddress] = useState(existingShop?.address || '');
  const [lat, setLat] = useState(existingShop?.latitude || DEFAULT_LOCATION.lat);
  const [lng, setLng] = useState(existingShop?.longitude || DEFAULT_LOCATION.lng);
  const [imagePreview, setImagePreview] = useState<string | null>(existingShop?.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [openTime, setOpenTime] = useState(existingShop?.opening_hours?.open || '09:00');
  const [closeTime, setCloseTime] = useState(existingShop?.opening_hours?.close || '21:00');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>(
    existingOffer?.discount_type || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState(
    existingOffer?.discount_value?.toString() || '10'
  );
  const [offerDescription, setOfferDescription] = useState(existingOffer?.description || '');
  const [dailyCap, setDailyCap] = useState(existingShop?.daily_cap?.toString() || '50');
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setError(null);
    try {
      const result = await geocodeAddress(address.trim());
      if (!result) {
        setError('Could not find that address. Try being more specific, or use "Use my location".');
        return;
      }
      setLat(result.lat);
      setLng(result.lng);
    } catch {
      setError('Address lookup failed. Using current location instead.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          if (!address.trim()) setAddress('My current location');
        },
        () => setError('Could not get your location. Enter your address manually.')
      );
    }
  };

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      setError('Enter a shop name first so the AI has something to work with.');
      return;
    }
    setGeneratingDescription(true);
    setError(null);
    try {
      const description = await generateShopDescription(
        name.trim(),
        category,
        discountType,
        parseFloat(discountValue) || 0
      );
      setOfferDescription(description);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI generation failed.';
      if (message.toLowerCase().includes('not configured')) {
        setAiUnavailable(true);
      } else {
        setError(message);
      }
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a shop name.');
      return;
    }
    if (!discountValue || parseFloat(discountValue) <= 0) {
      setError('Please enter a valid discount value.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let imageUrl = existingShop?.image_url ?? null;
      let fullImage: string | undefined;
      if (imageFile) {
        const compressed = await compressShopPhoto(imageFile);
        imageUrl = compressed.thumbnail;
        fullImage = compressed.full;
      }

      const shopInput: ShopInput = {
        name: name.trim(),
        category,
        image_url: imageUrl,
        address: address.trim() || null,
        latitude: lat,
        longitude: lng,
        opening_hours: { open: openTime, close: closeTime },
        is_active: true,
        daily_cap: parseInt(dailyCap) || 50,
        offer: {
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          description: offerDescription.trim(),
        },
        active_from: existingShop?.active_from ?? null,
        active_until: existingShop?.active_until ?? null,
      };

      if (isEdit && existingShop) {
        await updateShop(existingShop, shopInput, fullImage);
      } else {
        await createShop(ownerUid, shopInput, fullImage);
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shop.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-slide-up sm:animate-scale-in">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-100 z-10">
          <h2 className="font-bold text-lg text-slate-900">
            {isEdit ? 'Edit Shop' : 'Register Your Shop'}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Photo upload */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Shop Photo</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                id="shop-photo-input"
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden h-40 bg-slate-100">
                  <img src={imagePreview} alt="Shop preview" className="h-full w-full object-cover" />
                  <label
                    htmlFor="shop-photo-input"
                    className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Camera size={14} />
                    Change
                  </label>
                </div>
              ) : (
                <label
                  htmlFor="shop-photo-input"
                  className="flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                >
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <span className="text-sm text-slate-500 font-medium">Tap to upload a photo</span>
                  <span className="text-xs text-slate-400 mt-0.5">JPG, PNG up to 5 MB</span>
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Shop Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sharma Grocery"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_LIST.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon size={18} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, area, city (e.g. Linking Rd, Bandra, Mumbai)"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleGeocode}
                disabled={geocoding || !address.trim()}
                className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 disabled:opacity-40 flex items-center justify-center"
                title="Look up address"
              >
                {geocoding ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Search size={18} />
                )}
              </button>
            </div>
            <button
              onClick={handleUseMyLocation}
              className="mt-2 text-xs font-medium text-blue-600 flex items-center gap-1"
            >
              <MapPin size={12} />
              Or use my current location
            </button>
            <p className="text-xs text-slate-400 mt-1">
              Pin location: {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Opens</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Closes</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Offer Details</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                  discountType === 'percentage'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Percentage (%)
              </button>
              <button
                onClick={() => setDiscountType('flat')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                  discountType === 'flat'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Flat (Rs.)
              </button>
            </div>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? '10' : '50'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <textarea
              value={offerDescription}
              onChange={(e) => setOfferDescription(e.target.value)}
              placeholder="Offer description (e.g. 10% off on groceries over Rs.500)"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {!aiUnavailable && (
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={generatingDescription}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
              >
                {generatingDescription ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                {generatingDescription ? 'Writing...' : 'Generate with AI'}
              </button>
            )}
            {aiUnavailable && (
              <p className="mt-2 text-xs text-slate-400">
                AI description generation isn't set up for this project yet.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Daily Code Limit
            </label>
            <input
              type="number"
              value={dailyCap}
              onChange={(e) => setDailyCap(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Maximum number of discount codes shoppers can generate per day
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Register Shop'}
          </button>
        </div>
      </div>
    </div>
  );
}
