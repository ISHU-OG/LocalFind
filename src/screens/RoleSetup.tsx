import { useState } from 'react';
import { Loader2, MapPin, Store, AlertCircle, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

export default function RoleSetup() {
  const { user, completeSignup } = useAuth();
  const [role, setRole] = useState<Role>('shopper');
  const [name, setName] = useState(user?.displayName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Enter a display name.');
      return;
    }
    setSubmitting(true);
    try {
      await completeSignup(role, name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish setup.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-sm w-full mx-auto">
        <h1 className="text-xl font-bold text-slate-900 text-center">One last step</h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-8">
          Tell us a bit about yourself
        </p>

        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
          Display name
        </label>
        <div className="relative mb-6">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How other users will see you"
            className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
          I want to
        </label>
        <div className="space-y-3 mb-6">
          <RoleOption
            icon={MapPin}
            title="Discover shops"
            description="Browse nearby offers and redeem discount codes"
            selected={role === 'shopper'}
            onClick={() => setRole('shopper')}
          />
          <RoleOption
            icon={Store}
            title="Manage a shop"
            description="Register your shop and offer discounts to shoppers"
            selected={role === 'shopkeeper'}
            onClick={() => setRole('shopkeeper')}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Continue
        </button>
        <p className="text-xs text-slate-400 text-center mt-3">
          You can switch modes anytime from your profile.
        </p>
      </div>
    </div>
  );
}

function RoleOption({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
        selected
          ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
          : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          selected ? 'bg-slate-900' : 'bg-slate-100'
        }`}
      >
        <Icon size={18} className={selected ? 'text-white' : 'text-slate-600'} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}
