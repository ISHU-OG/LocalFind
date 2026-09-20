import type { DiscountType, Offer, Shop } from './types';

interface DiscountLike {
  discount_type?: DiscountType;
  discount_value?: number;
  locked_discount_type?: DiscountType;
  locked_discount_value?: number;
}

/** "10% OFF", "Rs. 50 OFF" or "BOGO" - works for both offers and locked code terms. */
export function formatDiscount(d: DiscountLike): string {
  const type = d.discount_type ?? d.locked_discount_type;
  const value = d.discount_value ?? d.locked_discount_value ?? 0;
  if (type === 'bogo') return 'Buy 1 Get 1';
  if (type === 'percentage') return `${value}% OFF`;
  return `Rs. ${value} OFF`;
}

/** Compact version for map pins and small badges. */
export function formatDiscountShort(d: DiscountLike): string {
  const type = d.discount_type ?? d.locked_discount_type;
  const value = d.discount_value ?? d.locked_discount_value ?? 0;
  if (type === 'bogo') return 'BOGO';
  if (type === 'percentage') return `${value}%`;
  return `Rs.${value}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** True when the offer has no time window, or `now` falls inside it (supports overnight windows). */
export function isOfferWindowOpen(offer: Offer, now: Date): boolean {
  if (!offer.window_start || !offer.window_end) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(offer.window_start);
  const end = toMinutes(offer.window_end);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

/** True unless the shop has a seasonal date range that excludes today. */
export function isShopInSeason(shop: Pick<Shop, 'active_from' | 'active_until'>, now = new Date()): boolean {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (shop.active_from && today < shop.active_from) return false;
  if (shop.active_until && today > shop.active_until) return false;
  return true;
}
