import { useState } from 'react';
import { MapPin, ShoppingBag, Store, ChevronRight, Sparkles } from 'lucide-react';

interface OnboardingProps {
  onContinue: () => void;
}

export default function Onboarding({ onContinue }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: MapPin,
      title: 'Discover Local Shops',
      message: 'Find grocery stores, bakeries, pharmacies, and more right around you.',
      bg: 'bg-blue-50',
      color: 'text-blue-600',
    },
    {
      icon: ShoppingBag,
      title: 'Get Exclusive Discounts',
      message: 'Generate a code in seconds and show it to the shopkeeper for instant savings.',
      bg: 'bg-emerald-50',
      color: 'text-emerald-600',
    },
    {
      icon: Store,
      title: 'Are You a Shop Owner?',
      message: 'Switch to Shopkeeper mode to register your shop, manage offers, and confirm codes.',
      bg: 'bg-amber-50',
      color: 'text-amber-600',
    },
  ];

  const current = slides[step];
  const Icon = current.icon;
  const isLast = step === slides.length - 1;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className={`w-24 h-24 rounded-3xl ${current.bg} flex items-center justify-center mb-8`}>
          <Icon size={44} className={current.color} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-3">{current.title}</h1>
        <p className="text-base text-slate-500 text-center max-w-xs leading-relaxed">
          {current.message}
        </p>
      </div>

      <div className="px-6 pb-8">
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-7 bg-slate-900' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => (isLast ? onContinue() : setStep(step + 1))}
          className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {isLast ? (
            <>
              <Sparkles size={16} />
              Get Started
            </>
          ) : (
            <>
              Continue
              <ChevronRight size={16} />
            </>
          )}
        </button>

        {step < 2 && (
          <button
            onClick={onContinue}
            className="w-full py-2.5 text-sm text-slate-400 font-medium mt-2"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
