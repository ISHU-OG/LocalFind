export type Role = 'shopper' | 'shopkeeper';

export interface UserProfile {
  uid: string;
  role: Role;
  display_name: string;
  email: string | null;
}

export type DiscountType = 'percentage' | 'flat' | 'bogo';

export interface Offer {
  id: string;
  shop_id: string;
  discount_type: DiscountType;
  discount_value: number;
  description: string;
  is_active: boolean;
  /** Only shoppers with no earlier confirmed redemption at this shop may use it. */
  first_visit_only: boolean;
  /** Optional daily time window "HH:mm" (e.g. happy hour). Null = all opening hours. */
  window_start: string | null;
  window_end: string | null;
  created_at: string;
}

export interface Shop {
  id: string;
  owner_uid: string;
  name: string;
  category: string;
  /** Small inline thumbnail (data URL). The full photo lives in shop_images/{id}. */
  image_url: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  opening_hours: { open: string; close: string };
  is_active: boolean;
  daily_cap: number;
  offer: Offer | null;
  /** Set manually by an admin in the Firebase console. Owners cannot change it. */
  verified: boolean;
  /** Optional seasonal date range, "YYYY-MM-DD". */
  active_from: string | null;
  active_until: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
}

export interface Code {
  id: string;
  shop_id: string;
  shop_name: string;
  owner_uid: string;
  shopper_uid: string;
  shopper_name: string;
  offer_id: string;
  code: string;
  status: 'active' | 'confirmed' | 'expired';
  locked_discount_type: DiscountType;
  locked_discount_value: number;
  locked_offer_description: string;
  distance_m: number;
  generated_at: string;
  expires_at: string;
  confirmed_at: string | null;
  confirmed_by_uid: string | null;
  bill_amount: number | null;
  saved_amount: number | null;
}

export interface Review {
  id: string;
  shop_id: string;
  code_id: string;
  reviewer_uid: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

/** Shop plus a convenience array so UI code can keep using `shop.offers`. */
export interface ShopWithOffer extends Shop {
  offers: Offer[];
}

export interface CodeWithShop extends Code {
  shop: ShopWithOffer;
}

export interface AppUser {
  uid: string;
  name: string;
}
