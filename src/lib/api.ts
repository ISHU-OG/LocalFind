import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  serverTimestamp,
  increment,
  Timestamp,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { CODE_EXPIRY_MINUTES, PROXIMITY_LIMIT_KM } from './constants';
import { isOfferWindowOpen } from './offers';
import type {
  AppUser,
  Code,
  DiscountType,
  Offer,
  Review,
  Role,
  Shop,
  ShopWithOffer,
} from './types';

/* -------------------------------------------------------------------------- */
/* Converters (Firestore Timestamp <-> ISO strings used by the UI)             */
/* -------------------------------------------------------------------------- */

function isoOrNull(v: unknown): string | null {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === 'string') return v;
  return null;
}

function iso(v: unknown): string {
  return isoOrNull(v) ?? new Date().toISOString();
}

function offerFromData(shopId: string, raw: unknown): Offer | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    id: String(o.id ?? ''),
    shop_id: shopId,
    discount_type: (o.discount_type as DiscountType) ?? 'percentage',
    discount_value: Number(o.discount_value ?? 0),
    description: String(o.description ?? ''),
    is_active: o.is_active !== false,
    first_visit_only: o.first_visit_only === true,
    window_start: typeof o.window_start === 'string' ? o.window_start : null,
    window_end: typeof o.window_end === 'string' ? o.window_end : null,
    created_at: typeof o.created_at === 'string' ? o.created_at : '',
  };
}

export function shopFromData(id: string, d: DocumentData): ShopWithOffer {
  const offer = offerFromData(id, d.offer);
  return {
    id,
    owner_uid: d.owner_uid,
    name: d.name ?? '',
    category: d.category ?? 'other',
    image_url: d.image_url ?? null,
    address: d.address ?? null,
    latitude: d.latitude,
    longitude: d.longitude,
    opening_hours: d.opening_hours ?? { open: '09:00', close: '21:00' },
    is_active: d.is_active !== false,
    daily_cap: d.daily_cap ?? 50,
    offer,
    verified: d.verified === true,
    active_from: d.active_from ?? null,
    active_until: d.active_until ?? null,
    created_at: iso(d.created_at),
    updated_at: iso(d.updated_at),
    last_active_at: isoOrNull(d.last_active_at),
    offers: offer ? [offer] : [],
  };
}

export function codeFromData(id: string, d: DocumentData): Code {
  const generated = iso(d.generated_at);
  return {
    id,
    shop_id: d.shop_id,
    shop_name: d.shop_name ?? '',
    owner_uid: d.owner_uid,
    shopper_uid: d.shopper_uid,
    shopper_name: d.shopper_name ?? '',
    offer_id: d.offer_id ?? '',
    code: d.code,
    status: d.status,
    locked_discount_type: d.locked_discount_type,
    locked_discount_value: Number(d.locked_discount_value ?? 0),
    locked_offer_description: d.locked_offer_description ?? '',
    distance_m: d.distance_m ?? 0,
    generated_at: generated,
    // Expiry is derived from the SERVER timestamp, so a wrong phone clock can
    // never create or extend a code (see firestore.rules validConfirm).
    expires_at: new Date(new Date(generated).getTime() + CODE_EXPIRY_MINUTES * 60000).toISOString(),
    confirmed_at: isoOrNull(d.confirmed_at),
    confirmed_by_uid: d.confirmed_by_uid ?? null,
    bill_amount: typeof d.bill_amount === 'number' ? d.bill_amount : null,
    saved_amount: typeof d.saved_amount === 'number' ? d.saved_amount : null,
  };
}

function reviewFromData(id: string, d: DocumentData): Review {
  return {
    id,
    shop_id: d.shop_id,
    code_id: d.code_id,
    reviewer_uid: d.reviewer_uid,
    reviewer_name: d.reviewer_name ?? '',
    rating: Number(d.rating ?? 0),
    comment: d.comment ?? '',
    created_at: iso(d.created_at),
  };
}

const READ_OPTS = { serverTimestamps: 'estimate' } as const;

function isPermissionDenied(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'permission-denied';
}

/** UTC calendar day of the shop's daily-cap counter, e.g. "20260920". Matches dayKey() in firestore.rules. */
function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export function subscribeUserDoc(
  uid: string,
  onData: (data: { role: Role; display_name: string; email: string | null } | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data();
      onData({
        role: d.role === 'shopkeeper' ? 'shopkeeper' : 'shopper',
        display_name: d.display_name ?? '',
        email: d.email ?? null,
      });
    },
    onError
  );
}

/** Creates the private user document and the public leaderboard profile. */
export async function createUserDocs(
  uid: string,
  email: string | null,
  displayName: string,
  role: Role
): Promise<void> {
  const name = displayName.trim().slice(0, 40) || 'LocalFind user';
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), {
    role,
    email,
    display_name: name,
    created_at: serverTimestamp(),
  });
  const publicRef = doc(db, 'public_profiles', uid);
  const publicSnap = await getDoc(publicRef);
  if (!publicSnap.exists()) {
    batch.set(publicRef, {
      display_name: name,
      redeemed_count: 0,
      created_at: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function updateUserRole(uid: string, role: Role): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  const name = displayName.trim().slice(0, 40);
  if (!name) throw new Error('Name cannot be empty.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), { display_name: name });
  batch.update(doc(db, 'public_profiles', uid), { display_name: name });
  await batch.commit();
}

/* -------------------------------------------------------------------------- */
/* Shops                                                                       */
/* -------------------------------------------------------------------------- */

export function subscribeShops(
  onData: (shops: ShopWithOffer[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'shops'), where('is_active', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const shops = snap.docs.map((d) => shopFromData(d.id, d.data(READ_OPTS)));
      shops.sort((a, b) => b.created_at.localeCompare(a.created_at));
      onData(shops);
    },
    onError
  );
}

export function subscribeOwnerShops(
  ownerUid: string,
  onData: (shops: ShopWithOffer[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'shops'), where('owner_uid', '==', ownerUid));
  return onSnapshot(
    q,
    (snap) => {
      const shops = snap.docs.map((d) => shopFromData(d.id, d.data(READ_OPTS)));
      shops.sort((a, b) => b.created_at.localeCompare(a.created_at));
      onData(shops);
    },
    onError
  );
}

export interface OfferInput {
  discount_type: DiscountType;
  discount_value: number;
  description: string;
  is_active?: boolean;
  first_visit_only?: boolean;
  window_start?: string | null;
  window_end?: string | null;
}

export interface ShopInput {
  name: string;
  category: string;
  image_url: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  opening_hours: { open: string; close: string };
  is_active: boolean;
  daily_cap: number;
  offer: OfferInput | null;
  active_from: string | null;
  active_until: string | null;
}

function offerToData(existing: Offer | null, input: OfferInput) {
  return {
    id: existing?.id || crypto.randomUUID(),
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    description: input.description,
    is_active: input.is_active ?? true,
    first_visit_only: input.first_visit_only ?? false,
    window_start: input.window_start ?? null,
    window_end: input.window_end ?? null,
    created_at: existing?.created_at || new Date().toISOString(),
  };
}

function shopFields(input: ShopInput, existingOffer: Offer | null) {
  return {
    name: input.name,
    category: input.category,
    image_url: input.image_url,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    opening_hours: input.opening_hours,
    is_active: input.is_active,
    daily_cap: input.daily_cap,
    offer: input.offer ? offerToData(existingOffer, input.offer) : null,
    active_from: input.active_from,
    active_until: input.active_until,
  };
}

async function saveFullImage(shopId: string, dataUrl: string): Promise<void> {
  await setDoc(doc(db, 'shop_images', shopId), {
    data_url: dataUrl,
    updated_at: serverTimestamp(),
  });
}

export async function createShop(
  ownerUid: string,
  input: ShopInput,
  fullImage?: string | null
): Promise<string> {
  const ref = doc(collection(db, 'shops'));
  await setDoc(ref, {
    owner_uid: ownerUid,
    ...shopFields(input, null),
    verified: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    last_active_at: serverTimestamp(),
  });
  // The image document is checked against the shop's owner, so it must be written after the shop.
  if (fullImage) await saveFullImage(ref.id, fullImage);
  return ref.id;
}

export async function updateShop(
  shop: Shop,
  input: ShopInput,
  fullImage?: string | null
): Promise<void> {
  await updateDoc(doc(db, 'shops', shop.id), {
    ...shopFields(input, shop.offer),
    updated_at: serverTimestamp(),
  });
  if (fullImage) await saveFullImage(shop.id, fullImage);
}

/** Pause / resume the whole listing without deleting anything. */
export async function setShopListingActive(shopId: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, 'shops', shopId), {
    is_active: isActive,
    updated_at: serverTimestamp(),
  });
}

/** Instantly switch the shop's current offer on or off. */
export async function setOfferActive(shop: Shop, isActive: boolean): Promise<void> {
  if (!shop.offer) return;
  const { shop_id: _shopId, ...rest } = shop.offer;
  await updateDoc(doc(db, 'shops', shop.id), {
    offer: { ...rest, is_active: isActive },
    updated_at: serverTimestamp(),
  });
}

/** Marks the shop as recently used by its owner (feeds the inactive-shop ranking). */
export async function touchShopActivity(shopId: string): Promise<void> {
  await updateDoc(doc(db, 'shops', shopId), {
    last_active_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function fetchShopImage(shopId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'shop_images', shopId));
  if (!snap.exists()) return null;
  const url = snap.data().data_url;
  return typeof url === 'string' ? url : null;
}

/* -------------------------------------------------------------------------- */
/* Saved shops                                                                 */
/* -------------------------------------------------------------------------- */

export function subscribeSavedShops(
  uid: string,
  onData: (shopIds: string[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', uid, 'saved'),
    (snap) => onData(snap.docs.map((d) => d.id)),
    onError
  );
}

export async function saveShop(uid: string, shopId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'saved', shopId), {
    shop_id: shopId,
    created_at: serverTimestamp(),
  });
}

export async function unsaveShop(uid: string, shopId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'saved', shopId));
}

/* -------------------------------------------------------------------------- */
/* Codes                                                                       */
/* -------------------------------------------------------------------------- */

export function subscribeShopperCodes(
  uid: string,
  onData: (codes: Code[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'codes'), where('shopper_uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const codes = snap.docs.map((d) => codeFromData(d.id, d.data(READ_OPTS)));
      codes.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
      onData(codes);
    },
    onError
  );
}

export function subscribeOwnerCodes(
  ownerUid: string,
  onData: (codes: Code[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'codes'), where('owner_uid', '==', ownerUid));
  return onSnapshot(
    q,
    (snap) => {
      const codes = snap.docs.map((d) => codeFromData(d.id, d.data(READ_OPTS)));
      codes.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
      onData(codes);
    },
    onError
  );
}

async function fetchMyCodesOnce(uid: string): Promise<Code[]> {
  const snap = await getDocs(query(collection(db, 'codes'), where('shopper_uid', '==', uid)));
  return snap.docs.map((d) => codeFromData(d.id, d.data(READ_OPTS)));
}

class CodeCollision extends Error {}

export interface GenerateCodeInput {
  shop: ShopWithOffer;
  user: AppUser;
  /** Distance from the shopper's GPS fix to the shop pin, or null if location is unavailable. */
  distanceKm: number | null;
}

/**
 * Creates a single-use code. The Firestore transaction reads the shop's live
 * offer and today's counter, then writes the code and bumps the counter
 * atomically - the security rules re-check every one of those conditions on
 * the server, so a modified client cannot skip them.
 */
export async function generateCode({ shop, user, distanceKm }: GenerateCodeInput): Promise<Code> {
  const offer = shop.offer;
  if (!shop.is_active || !offer || !offer.is_active) {
    throw new Error('This shop has no active offer right now.');
  }
  if (user.uid === shop.owner_uid) {
    throw new Error('You cannot redeem a discount at your own shop.');
  }
  if (distanceKm === null) {
    throw new Error('Turn on location access so we can confirm you are at the shop.');
  }
  if (distanceKm > PROXIMITY_LIMIT_KM) {
    throw new Error(
      `You need to be within ${Math.round(PROXIMITY_LIMIT_KM * 1000)} m of the shop to generate a code. You are ${Math.round(distanceKm * 1000)} m away.`
    );
  }
  if (!isOfferWindowOpen(offer, new Date())) {
    throw new Error(
      `This offer is only valid between ${offer.window_start} and ${offer.window_end}.`
    );
  }

  const mine = await fetchMyCodesOnce(user.uid);
  const existing = mine.find(
    (c) =>
      c.shop_id === shop.id &&
      c.status === 'active' &&
      new Date(c.expires_at).getTime() > Date.now()
  );
  if (existing) return existing;

  if (offer.first_visit_only && mine.some((c) => c.shop_id === shop.id && c.status === 'confirmed')) {
    throw new Error('This offer is for first-time visitors only, and you have already redeemed here.');
  }

  const shopRef = doc(db, 'shops', shop.id);
  const dayRef = doc(db, 'shops', shop.id, 'daily', utcDayKey());

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeId = `${shop.id}_${code}`;
    const codeRef = doc(db, 'codes', codeId);

    try {
      await runTransaction(db, async (tx) => {
        const shopSnap = await tx.get(shopRef);
        if (!shopSnap.exists()) throw new Error('This shop no longer exists.');
        const live = shopFromData(shopSnap.id, shopSnap.data());
        const liveOffer = live.offer;
        if (!live.is_active || !liveOffer || !liveOffer.is_active) {
          throw new Error('This shop has no active offer right now.');
        }

        const daySnap = await tx.get(dayRef);
        const used = daySnap.exists() ? Number(daySnap.data().count ?? 0) : 0;
        if (used >= live.daily_cap) {
          throw new Error('This shop has reached its daily code limit. Please try again tomorrow.');
        }

        const codeSnap = await tx.get(codeRef);
        if (codeSnap.exists()) throw new CodeCollision();

        // Terms are copied from the shop's CURRENT offer and frozen in the code.
        tx.set(codeRef, {
          shop_id: live.id,
          shop_name: live.name,
          owner_uid: live.owner_uid,
          shopper_uid: user.uid,
          shopper_name: user.name.slice(0, 60),
          offer_id: liveOffer.id,
          code,
          status: 'active',
          locked_discount_type: liveOffer.discount_type,
          locked_discount_value: liveOffer.discount_value,
          locked_offer_description: liveOffer.description,
          distance_m: Math.round(distanceKm * 1000),
          generated_at: serverTimestamp(),
        });
        tx.set(dayRef, { count: used + 1, last_code_id: codeId });
      });

      const created = await getDoc(codeRef);
      return codeFromData(created.id, created.data(READ_OPTS) ?? {});
    } catch (err) {
      // A collision (or the permission-denied Firestore raises when the probed id
      // belongs to someone else's code) just means: try another number.
      if (err instanceof CodeCollision || isPermissionDenied(err)) continue;
      throw err;
    }
  }

  throw new Error(
    'Could not generate a code right now. The shop may have just changed its offer - reopen the shop and try again.'
  );
}

export function computeSavedAmount(
  type: DiscountType,
  value: number,
  billAmount: number | null
): number | null {
  if (type === 'flat') return billAmount != null ? Math.min(value, billAmount) : value;
  if (type === 'percentage') return billAmount != null ? Math.round(billAmount * value) / 100 : null;
  return null; // buy-one-get-one: the saving depends on the item, so it is not guessed
}

/**
 * Shopkeeper confirms a code. Runs in a transaction and, in the same commit,
 * bumps the shopper's public redemption counter (rules only allow that bump
 * together with a real confirmation).
 */
export async function confirmCode(
  code: Code,
  ownerUid: string,
  billAmount: number | null
): Promise<void> {
  const codeRef = doc(db, 'codes', code.id);
  const profileRef = doc(db, 'public_profiles', code.shopper_uid);
  const saved = computeSavedAmount(code.locked_discount_type, code.locked_discount_value, billAmount);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(codeRef);
      if (!snap.exists()) throw new Error('Code not found.');
      const fresh = codeFromData(snap.id, snap.data(READ_OPTS));
      if (fresh.status === 'confirmed') throw new Error('This code has already been confirmed.');
      if (new Date(fresh.expires_at).getTime() < Date.now()) throw new Error('This code has expired.');

      const profileSnap = await tx.get(profileRef);

      tx.update(codeRef, {
        status: 'confirmed',
        confirmed_at: serverTimestamp(),
        confirmed_by_uid: ownerUid,
        bill_amount: billAmount,
        saved_amount: saved,
      });
      if (profileSnap.exists()) {
        tx.update(profileRef, { redeemed_count: increment(1), last_code_id: code.id });
      }
    });
  } catch (err) {
    if (isPermissionDenied(err)) {
      throw new Error('This code has expired or was already confirmed.');
    }
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* Reviews, reports, leaderboard                                               */
/* -------------------------------------------------------------------------- */

export async function fetchReviewsForShop(shopId: string): Promise<Review[]> {
  const snap = await getDocs(query(collection(db, 'reviews'), where('shop_id', '==', shopId)));
  const reviews = snap.docs.map((d) => reviewFromData(d.id, d.data(READ_OPTS)));
  reviews.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return reviews;
}

/** Reviews written since `sinceIso` (used for the "top rated this week" carousel). */
export async function fetchRecentReviews(sinceIso: string): Promise<Review[]> {
  const snap = await getDocs(
    query(collection(db, 'reviews'), where('created_at', '>=', Timestamp.fromDate(new Date(sinceIso))))
  );
  return snap.docs.map((d) => reviewFromData(d.id, d.data(READ_OPTS)));
}

export async function submitReview(
  code: Code,
  user: AppUser,
  rating: number,
  comment: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'reviews', code.id), {
      shop_id: code.shop_id,
      code_id: code.id,
      reviewer_uid: user.uid,
      reviewer_name: user.name.slice(0, 60),
      rating,
      comment: comment.trim().slice(0, 300),
      created_at: serverTimestamp(),
    });
  } catch (err) {
    if (isPermissionDenied(err)) {
      throw new Error('You already reviewed this visit, or the redemption is not confirmed yet.');
    }
    throw err;
  }
}

export type ReportType = 'dispute' | 'expired' | 'not_honored' | 'misuse' | 'other';

export async function createReport(
  code: Code,
  reporterUid: string,
  reportType: ReportType,
  description: string
): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    code_id: code.id,
    shop_id: code.shop_id,
    reporter_uid: reporterUid,
    reporter_role: reporterUid === code.shopper_uid ? 'shopper' : 'shopkeeper',
    report_type: reportType,
    description: description.trim().slice(0, 1000),
    created_at: serverTimestamp(),
  });
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  confirmedCount: number;
}

export async function fetchLeaderboard(limitN = 10): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'public_profiles'), orderBy('redeemed_count', 'desc'), limit(limitN))
  );
  return snap.docs
    .map((d) => ({
      uid: d.id,
      displayName: String(d.data().display_name ?? 'Shopper'),
      confirmedCount: Number(d.data().redeemed_count ?? 0),
    }))
    .filter((e) => e.confirmedCount > 0);
}
