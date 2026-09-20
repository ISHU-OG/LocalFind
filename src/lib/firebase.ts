import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** False until the four VITE_FIREBASE_* values are present in .env */
export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  authInstance = getAuth(app);
  // Offline cache: shops you have already seen still load on a bad connection,
  // and writes made while offline sync when you are back online.
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

// The app never renders past <SetupScreen/> when Firebase is not configured,
// so it is safe to expose these as non-null everywhere else.
export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
