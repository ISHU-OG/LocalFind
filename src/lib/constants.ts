import {
  ShoppingBag,
  Croissant,
  Pill,
  Coffee,
  BookOpen,
  Smartphone,
  UtensilsCrossed,
  Shirt,
  Pencil,
  Store,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  grocery: {
    label: 'Grocery',
    icon: ShoppingBag,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
  },
  bakery: {
    label: 'Bakery',
    icon: Croissant,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  pharmacy: {
    label: 'Pharmacy',
    icon: Pill,
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
  },
  cafe: {
    label: 'Cafe',
    icon: Coffee,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
  },
  books: {
    label: 'Books',
    icon: BookOpen,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
  },
  electronics: {
    label: 'Electronics',
    icon: Smartphone,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  restaurant: {
    label: 'Restaurant',
    icon: UtensilsCrossed,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  clothing: {
    label: 'Clothing',
    icon: Shirt,
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
  },
  stationery: {
    label: 'Stationery',
    icon: Pencil,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
  },
  other: {
    label: 'Other',
    icon: Store,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
  },
};

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([key, cfg]) => ({
  key,
  ...cfg,
}));

export const DEFAULT_LOCATION = {
  lat: 19.076,
  lng: 72.8777,
  label: 'Mumbai, IN',
};

// Must match the 20-minute window enforced in firestore.rules (validConfirm).
export const CODE_EXPIRY_MINUTES = 20;

// Shopper must be within this distance of the shop pin to generate a code.
export const PROXIMITY_LIMIT_KM = 0.5;
