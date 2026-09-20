import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Clock, CheckCircle2, AlertCircle, Store, Flag, Share2 } from 'lucide-react';
import type { CodeWithShop, AppUser } from '@/lib/types';
import { CODE_EXPIRY_MINUTES } from '@/lib/constants';
import ReviewForm from '@/components/ReviewForm';

interface CodeRevealProps {
  codeData: CodeWithShop;
  onDismiss: () => void;
  onReport?: () => void;
  user: AppUser;
}

export default function CodeReveal({ codeData, onDismiss, onReport, user }: CodeRevealProps) {
  const [now, setNow] = useState(Date.now());
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const expiry = new Date(codeData.expires_at).getTime();
  const remaining = Math.max(0, expiry - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const isExpired = remaining <= 0;
  const isConfirmed = codeData.status === 'confirmed';

  useEffect(() => {
    if (isConfirmed || isExpired || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, codeData.code, {
      width: 160,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => {
      // If QR rendering fails for any reason, the 6-digit code above the
      // canvas is still fully usable on its own.
    });
  }, [codeData.code, isConfirmed, isExpired]);

  const handleShare = () => {
    const discount =
      codeData.locked_discount_type === 'percentage'
        ? `${codeData.locked_discount_value}% off`
        : `Rs. ${codeData.locked_discount_value} off`;
    const message = `I just found ${discount} at ${codeData.shop.name} on LocalFind! Worth checking out if you're nearby.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto animate-slide-up sm:animate-scale-in">
        <div className="flex items-center gap-2 mb-1">
          <Store size={18} className="text-slate-700" />
          <span className="text-sm font-medium text-slate-600">{codeData.shop.name}</span>
        </div>

        {isConfirmed ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Discount Confirmed!</h2>
            <p className="text-sm text-slate-500 mt-2 text-center">
              Show this to the shopkeeper. Your discount has been verified.
            </p>

            {!reviewSubmitted && (
              <div className="w-full">
                <ReviewForm
                  code={codeData}
                  user={user}
                  onSubmitted={() => setReviewSubmitted(true)}
                />
              </div>
            )}

            <button
              onClick={handleShare}
              className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600"
            >
              <Share2 size={12} />
              Share this deal on WhatsApp
            </button>

            {onReport && (
              <button
                onClick={onReport}
                className="mt-3 text-xs font-medium text-red-500 flex items-center gap-1"
              >
                <Flag size={12} />
                Report an issue with this code
              </button>
            )}
          </div>
        ) : isExpired ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle size={36} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Code Expired</h2>
            <p className="text-sm text-slate-500 mt-2 text-center">
              This code is no longer valid. Generate a new one to get your discount.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-4">
              <Clock size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500">
                Expires in{' '}
                <span className={`font-semibold ${minutes < 5 ? 'text-red-600' : 'text-slate-700'}`}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              </span>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-center">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">
                Your Discount Code
              </p>
              <div className="flex justify-center gap-2 mb-4">
                {codeData.code.split('').map((digit, i) => (
                  <span
                    key={i}
                    className="text-4xl font-bold text-white tabular-nums tracking-wider"
                  >
                    {digit}
                  </span>
                ))}
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-2 rounded-xl">
                  <canvas ref={canvasRef} className="block" />
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-wide">
                Show the code or let the shopkeeper scan this QR
              </p>
            </div>

            <div className="mt-4 bg-emerald-50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Discount</span>
                <span className="font-bold text-emerald-700">
                  {codeData.locked_discount_type === 'percentage'
                    ? `${codeData.locked_discount_value}% OFF`
                    : `Rs. ${codeData.locked_discount_value} OFF`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{codeData.locked_offer_description}</p>
            </div>

            <div className="mt-3 bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                Show this code to the shopkeeper. They will confirm it to apply your discount.
                Code is valid for {CODE_EXPIRY_MINUTES} minutes.
              </p>
            </div>

            {onReport && (
              <button
                onClick={onReport}
                className="mt-3 text-xs font-medium text-red-500 flex items-center gap-1 mx-auto"
              >
                <Flag size={12} />
                Report an issue with this code
              </button>
            )}
          </>
        )}

        <button
          onClick={onDismiss}
          className="w-full mt-5 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
        >
          {isConfirmed ? 'Done' : isExpired ? 'Close' : 'Got it'}
        </button>
      </div>
    </div>
  );
}
