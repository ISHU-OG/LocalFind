# LocalFind - migration status (snapshot)

**Auth + the whole data layer are now wired end-to-end.** Every screen that used to call
a nonexistent or mismatched function has been rewritten against `api.ts`'s actual
exports. This was reviewed by hand very carefully - imports were cross-checked against
real exports, prop types were traced through every call site - but it has **never been
run**: this environment has no network, so `npm install` / `npm run typecheck` / a real
browser have not touched it. Treat it as "should work" not "does work" until you've run
those yourself. See "Before you trust this" at the bottom for exactly what to check first.

## Done - Phase 1 (auth + data layer), everything needed to run the app
- `firestore.rules`, `firebase.json`, `firestore.indexes.json`, `.firebaserc.example`,
  `.env.example` - unchanged from before, already complete.
- `src/lib/firebase.ts`, `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/offers.ts` -
  unchanged, already complete (see prior notes below for what each covers).
- **`src/lib/auth.tsx`** - AuthProvider/useAuth: email+password sign up/in, Google
  sign-in, password reset, anonymous guest sessions (`continueAsGuest`), sign out,
  `completeSignup`/`setRole` on top of `createUserDocs`/`updateUserRole`. Also exports
  `upgradeGuestWithGoogle`/`upgradeGuestWithEmail` to convert a guest session into a real
  account keeping the same uid - built, but no screen calls them yet (see below).
- **`src/screens/AuthScreen.tsx`**, **`RoleSetup.tsx`**, **`SetupScreen.tsx`** - sign
  in/up/reset + Google + guest browsing; post-signup role picker; missing-`.env` fallback.
- **`src/main.tsx`** / **`src/App.tsx`** - wraps the app in `AuthProvider`; gates on
  loading -> onboarding -> sign-in -> role setup -> the app. Shops/saved-shops/shopper-
  codes are now live Firestore listeners (`subscribeShops`, `subscribeSavedShops`,
  `subscribeShopperCodes`) instead of one-shot fetches, joined client-side into the
  `CodeWithShop` shape the UI expects. Passes a real `AppUser` (`{ uid, name }`) down to
  `ShopDetail`/`CodeReveal`, and the real `uid` to `Dashboard`/`ProfileScreen`.
- **`src/screens/ProfileScreen.tsx`** - shows the signed-in name/email (or "Browsing as
  guest"), a working Sign out / Exit guest mode button.
- **`src/screens/ShopDetail.tsx`** - now takes a `user: AppUser` prop; `generateCode` is
  called with the `{ shop, user, distanceKm }` object `api.ts` expects (distance was
  already being computed for the UI, just wasn't being reused); the report sheet now
  passes the whole `Code` object and a `reporterUid`, matching `createReport`'s real
  signature.
- **`src/components/CodeReveal.tsx`** / **`ReviewForm.tsx`** - `deviceId: string` replaced
  with `user: AppUser` / `code: Code`; `submitReview` now gets the real `Code` + `AppUser`
  it needs instead of three loose strings.
- **`src/components/ShopForm.tsx`** - `ownerDeviceId` renamed to `ownerUid`; no longer
  calls the nonexistent `createOffer`/`updateOffer`/`uploadShopImage`/`geocodeAddress`/
  `generateShopDescription` - offer fields are now nested into one `ShopInput` and passed
  to `createShop`/`updateShop` in a single call (matching how `api.ts` actually models a
  shop+offer together), and photo/geocoding/AI now go through three small new files:
  - **`src/lib/imageUtils.ts`** - canvas-based photo compression into a small thumbnail
    (for `shops/{id}.image_url`) and a larger version (for `shop_images/{id}`), since
    Storage needs the paid Blaze plan and everything lives in Firestore now.
  - **`src/lib/geocode.ts`** - direct browser call to OpenStreetMap's Nominatim API, no
    server needed. (Nominatim's usage policy asks for ~1 req/sec / no bulk lookups -
    fine for a one-off address search in a form, but worth knowing if you ever batch it.)
  - **`src/lib/ai.ts`** - `generateShopDescription` posts to `VITE_API_BASE_URL` if it's
    set; throws a recognizable "not configured" error otherwise, which `ShopForm` already
    catches to hide the AI button gracefully. The `server/` Express app it would talk to
    still doesn't exist (see Phase 2/optional below) - AI description writing is a no-op
    until that's built and deployed.
- **`src/screens/Dashboard.tsx`** - now uses `subscribeOwnerShops` + `subscribeOwnerCodes`
  (both already existed in `api.ts`) instead of a nonexistent `fetchShopsByOwner`/
  `fetchCodesForShop` loop; takes `ownerUid` instead of `ownerDeviceId`.
- **`src/screens/ConfirmCode.tsx`** - subscribes to the owner's codes and filters to this
  shop client-side (reuses `subscribeOwnerCodes` rather than adding a new query);
  `confirmCode` is now called with the real `(code: Code, ownerUid, billAmount)` shape -
  bill amount is passed as `null` for now since there's no bill-amount UI yet (Phase 2).
- Removed: Supabase client, migrations, edge functions, localStorage device ID.

### Guests
`continueAsGuest()` signs in anonymously via Firebase Auth, which is a real
`request.auth.uid` - the Firestore rules only check `signedIn()`, not a `users/{uid}`
profile doc, so a guest can browse, save shops, generate codes, everything, on that
anonymous uid. What's **not** built: a screen that calls `upgradeGuestWithGoogle`/
`upgradeGuestWithEmail` to convert that session into a real account without losing it -
today, tapping "sign out" as a guest just ends the anonymous session and whatever they
did under it is orphaned. Worth adding before shipping guest mode for real.

## Before you trust this
No network was available while writing this, so none of it has been run. In order of
what's most likely to actually break something:
1. `npm install`, then `npm run typecheck` (`tsc --noEmit`) - this is the first real
   signal. Imports/exports were checked by hand and with a script that cross-referenced
   every `import { x } from '@/lib/...'` against that file's actual `export`s, but a
   script isn't a type checker - things like the exact shape of `ShopInput`/`OfferInput`
   vs. what `ShopForm` builds haven't been verified field-by-field by anything but eyes.
2. `firebase emulators:start` (Firestore + Auth) and click through: sign up, pick a
   role, register a shop with a photo, generate a code from a second account, confirm it,
   leave a review. This exercises every function that was just rewired.
3. Only then deploy `firestore.rules` and test against a real project.

## Still to do - Phase 2 (PRD features missing from the app)
Discounts-only toggle; draggable pin picker with satellite toggle and duplicate-shop
warning; bottom-sheet pin preview; locate-me button; shopkeeper redemption list and
analytics; pause listing / instant offer toggle / seasonal dates; BOGO, first-visit and
time-window offers (data model ready, no UI); bill amount and savings total (confirmCode
already accepts a bill amount - ConfirmCode just always passes null right now); report
from history and shopkeeper-side reports; badges, streaks, leaderboard screen; "new shops
near you" and "top rated this week"; verified badge; dark-mode toggle; share-to-WhatsApp
on shop page; search autocomplete; density heatmap; AI shop-finder chatbot; guest-to-
real-account upgrade UI (see "Guests" above); optional `server/` Express app for AI
description generation and chat.

## Not possible on the free plan
Geofenced push notifications, SMS/USSD fallback, phone-number identity (need paid
Firebase features or extra infrastructure).

## Firebase console setup (needed to actually run this)
1. Create a project, add a Web app, copy the config into `.env`
2. Authentication -> enable Email/Password and Google; add your domain under Authorized
   domains. Also enable **Anonymous** sign-in if you want guest browsing to work.
3. Firestore Database -> create (production mode)
4. `npm i -g firebase-tools && firebase login && cp .firebaserc.example .firebaserc`
   (edit project id) then `firebase deploy --only firestore:rules`
