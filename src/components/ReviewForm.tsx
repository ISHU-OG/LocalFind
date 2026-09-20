import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { submitReview } from '@/lib/api';
import type { Code, AppUser } from '@/lib/types';

interface ReviewFormProps {
  code: Code;
  user: AppUser;
  onSubmitted: () => void;
}

export default function ReviewForm({ code, user, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Tap a star to rate your visit.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(code, user, rating, comment);
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mt-3 bg-emerald-50 rounded-xl p-3 text-center text-sm text-emerald-700 font-medium">
        Thanks for rating your visit!
      </div>
    );
  }

  return (
    <div className="mt-4 bg-slate-50 rounded-xl p-3.5">
      <p className="text-xs font-semibold text-slate-600 mb-2">Rate your visit</p>
      <div className="flex items-center justify-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 active:scale-90 transition-transform"
          >
            <Star
              size={26}
              className={
                n <= (hoverRating || rating)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300'
              }
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment about your visit"
        rows={2}
        maxLength={300}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
      />
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full mt-2 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        Submit Rating
      </button>
    </div>
  );
}
