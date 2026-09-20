import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { subscribeUserDoc, createUserDocs, updateUserRole } from './api';
import type { Role } from './types';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface AuthProfile {
  role: Role;
  display_name: string;
  email: string | null;
}

interface AuthContextValue {
  /** Firebase user. Also set for guests, since guest mode uses an anonymous
   *  Firebase Auth session so Firestore's `request.auth` rules still apply. */
  user: FirebaseUser | null;
  /** The Firestore `users/{uid}` doc. Null until `completeSignup` has run. */
  profile: AuthProfile | null;
  /** True once the initial Auth + profile listeners have both resolved. */
  loading: boolean;
  /** True when signed in anonymously (guest browsing, no email attached). */
  isGuest: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  /** Upgrades an anonymous guest session to a real account, keeping the same uid
   *  (so anything the guest already did stays attached to them). */
  upgradeGuestWithGoogle: () => Promise<void>;
  upgradeGuestWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  /** Creates the `users`/`public_profiles` docs for a brand new account. */
  completeSignup: (role: Role, displayName: string) => Promise<void>;
  setRole: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists with that email. Try signing in instead.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/credential-already-in-use':
      return 'That Google account is already linked to a different LocalFind account.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  }
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setAuthResolved(true);
      if (!fbUser) {
        setProfile(null);
        setProfileResolved(true);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileResolved(false);
    const unsub = subscribeUserDoc(
      user.uid,
      (data) => {
        setProfile(data);
        setProfileResolved(true);
      },
      (err) => {
        console.error('Failed to load profile:', err);
        setProfile(null);
        setProfileResolved(true);
      }
    );
    return unsub;
  }, [user]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
    } catch (err) {
      throw new Error(authErrorMessage(err));
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      throw new Error(authErrorMessage(err));
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      throw new Error(authErrorMessage(err));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      throw new Error(authErrorMessage(err));
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      throw new Error(authErrorMessage(err));
    }
  }, []);

  const upgradeGuestWithGoogle = useCallback(async () => {
    if (!auth.currentUser) throw new Error('No active session to upgrade.');
    try {
      await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
    } catch (err) {
      throw new Error(authErrorMessage(err));
    }
  }, []);

  const upgradeGuestWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!auth.currentUser) throw new Error('No active session to upgrade.');
      try {
        const credential = EmailAuthProvider.credential(email, password);
        const cred = await linkWithCredential(auth.currentUser, credential);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
      } catch (err) {
        throw new Error(authErrorMessage(err));
      }
    },
    []
  );

  const completeSignup = useCallback(
    async (role: Role, displayName: string) => {
      if (!user) throw new Error('You need to be signed in first.');
      try {
        await createUserDocs(user.uid, user.email, displayName || user.displayName || '', role);
      } catch (err) {
        throw new Error(authErrorMessage(err));
      }
    },
    [user]
  );

  const setRole = useCallback(
    async (role: Role) => {
      if (!user) throw new Error('You need to be signed in first.');
      await updateUserRole(user.uid, role);
    },
    [user]
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    loading: !authResolved || (Boolean(user) && !profileResolved),
    isGuest: Boolean(user?.isAnonymous),
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    continueAsGuest,
    upgradeGuestWithGoogle,
    upgradeGuestWithEmail,
    completeSignup,
    setRole,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
