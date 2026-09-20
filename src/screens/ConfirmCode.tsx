import { useState, useEffect } from 'react';
import {
  X,
  Search,
  Ticket,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  ScanLine,
} from 'lucide-react';
import type { ShopWithOffer, Code } from '@/lib/types';
import { subscribeOwnerCodes, confirmCode } from '@/lib/api';
import EmptyState from '@/components/EmptyState';
import QrScanner from '@/components/QrScanner';

interface ConfirmCodeProps {
  shop: ShopWithOffer;
  onClose: () => void;
}

export default function ConfirmCode({ shop, onClose }: ConfirmCodeProps) {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeOwnerCodes(
      shop.owner_uid,
      (data) => {
        setCodes(data.filter((c) => c.shop_id === shop.id));
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load codes:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [shop.owner_uid, shop.id]);

  const activeCodes = codes
    .filter((c) => c.status === 'active')
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());

  const matchedCode = activeCodes.find((c) => c.code === searchInput.trim());
  const confirmableCode = matchedCode || null;

  const isExpired = (code: Code) => new Date(code.expires_at).getTime() < Date.now();

  const handleConfirm = async (code: Code) => {
    setConfirming(code.id);
    setError(null);
    try {
      // Bill amount / savings entry isn't built yet, so we confirm without one for now.
      await confirmCode(code, shop.owner_uid, null);
      setSuccessCode(code.code);
      setSearchInput('');
      setTimeout(() => setSuccessCode(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm code.');
    } finally {
      setConfirming(null);
    }
  };

  const handleQrDetected = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(-6);
    setShowScanner(false);
    if (digits.length === 6) {
      setSearchInput(digits);
    } else {
      setError('That QR code doesn\'t look like a LocalFind discount code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col animate-slide-up sm:animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Confirm Codes</h2>
            <p className="text-xs text-slate-500">{shop.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Enter or scan code
            </label>
            <div className="relative mb-2 flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="flex-shrink-0 w-12 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                title="Scan QR code"
              >
                <ScanLine size={20} />
              </button>
            </div>

            {searchInput.length === 6 && confirmableCode && !isExpired(confirmableCode) && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span className="font-semibold text-emerald-800 text-sm">Code Found</span>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Discount</span>
                    <span className="font-bold text-emerald-700">
                      {confirmableCode.locked_discount_type === 'percentage'
                        ? `${confirmableCode.locked_discount_value}% OFF`
                        : `Rs. ${confirmableCode.locked_discount_value} OFF`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{confirmableCode.locked_offer_description}</p>
                </div>
                <button
                  onClick={() => handleConfirm(confirmableCode)}
                  disabled={confirming === confirmableCode.id}
                  className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirming === confirmableCode.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Confirm Discount
                    </>
                  )}
                </button>
              </div>
            )}

            {searchInput.length === 6 && !confirmableCode && (
              <div className="bg-red-50 rounded-xl p-3 flex items-start gap-2 animate-scale-in">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">No active code matches this number.</p>
              </div>
            )}

            {searchInput.length === 6 && confirmableCode && isExpired(confirmableCode) && (
              <div className="bg-red-50 rounded-xl p-3 flex items-start gap-2 animate-scale-in">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">This code has expired.</p>
              </div>
            )}

            {error && (
              <div className="mt-2 bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>
            )}

            {successCode && (
              <div className="mt-2 bg-emerald-50 text-emerald-700 text-sm rounded-xl p-3 flex items-center gap-2 animate-scale-in">
                <CheckCircle2 size={16} />
                Code {successCode} confirmed successfully!
              </div>
            )}

            <div className="mt-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock size={12} />
                Pending Codes ({activeCodes.length})
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : activeCodes.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="No pending codes"
                  message="When shoppers generate codes for your shop, they will appear here for confirmation."
                />
              ) : (
                <div className="space-y-2">
                  {activeCodes.map((code) => {
                    const expired = isExpired(code);
                    return (
                      <div
                        key={code.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                          expired
                            ? 'border-red-100 bg-red-50/50'
                            : 'border-slate-100 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                          <Ticket size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold font-mono text-slate-900 tracking-wider">
                            {code.code}
                          </p>
                          <p className="text-xs text-slate-500">
                            {expired ? 'Expired' : `${Math.max(0, Math.ceil((new Date(code.expires_at).getTime() - Date.now()) / 60000))} min left`}
                          </p>
                        </div>
                        {!expired && (
                          <button
                            onClick={() => handleConfirm(code)}
                            disabled={confirming === code.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {confirming === code.id ? '...' : 'Confirm'}
                          </button>
                        )}
                        {expired && (
                          <span className="text-xs font-semibold text-red-600 px-2 py-1 bg-red-100 rounded-lg">
                            Expired
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showScanner && (
        <QrScanner onDetect={handleQrDetected} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
