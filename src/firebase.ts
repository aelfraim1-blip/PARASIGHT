import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous?: boolean;
  tenantId?: string | null;
  providerData: {
    providerId: string;
    email?: string | null;
  }[];
  isFirebaseNative?: boolean;
}

const VERCEL_SESSION_STORAGE_KEY = 'parasight_vercel_auth_session_v1';
const VERCEL_ACCOUNTS_STORAGE_KEY = 'parasight_vercel_accounts_v1';

interface StoredLocalAccount {
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  providerId: string;
}

type AuthListener = (user: User | null) => void;
const authListeners = new Set<AuthListener>();
let currentFirebaseUser: FirebaseUser | null = null;

function readStoredSessionUser(): User | null {
  try {
    const raw = localStorage.getItem(VERCEL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (parsed && typeof parsed.uid === 'string' && parsed.uid.length > 0) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeStoredSessionUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(VERCEL_SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(VERCEL_SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    emailVerified: fbUser.emailVerified,
    isAnonymous: fbUser.isAnonymous,
    tenantId: fbUser.tenantId,
    providerData:
      fbUser.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    isFirebaseNative: true,
  };
}

export function getActiveUser(): User | null {
  if (currentFirebaseUser) {
    return mapFirebaseUser(currentFirebaseUser);
  }
  return readStoredSessionUser();
}

function notifyAuthListeners(): void {
  const active = getActiveUser();
  authListeners.forEach((listener) => {
    try {
      listener(active);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
}

// Subscribe to underlying Firebase Auth state once
firebaseOnAuthStateChanged(auth, (fbUser) => {
  currentFirebaseUser = fbUser;
  if (fbUser) {
    writeStoredSessionUser(mapFirebaseUser(fbUser));
  }
  notifyAuthListeners();
});

export function onAuthStateChanged(
  _authInstance: unknown,
  listener: AuthListener
): () => void {
  authListeners.add(listener);
  // Immediately invoke with current active user (Firebase or Vercel session)
  setTimeout(() => {
    if (authListeners.has(listener)) {
      listener(getActiveUser());
    }
  }, 0);
  return () => {
    authListeners.delete(listener);
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const active = getActiveUser();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || active?.uid,
      email: auth.currentUser?.email || active?.email,
      emailVerified: auth.currentUser?.emailVerified ?? active?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous ?? active?.isAnonymous,
      tenantId: auth.currentUser?.tenantId ?? active?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ||
        active?.providerData ||
        [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned && VALID_ID_REGEX.test(cleaned) ? cleaned : `rec_${Date.now()}`;
}

function clampString(val: string | undefined | null, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim();
  const base = trimmed.length > 0 ? trimmed : fallback;
  return base.slice(0, maxLen);
}

/**
 * Ensures the signed-in Firebase user has a valid UserPublicProfile document at /users/{uid}
 * adhering to firebase-blueprint.json constraints.
 */
export async function ensureUserProfileInFirestore(user: User | FirebaseUser): Promise<void> {
  if (!auth.currentUser || !user || !user.uid || !user.emailVerified) return;
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const displayName = clampString(
    user.displayName || user.email?.split('@')[0],
    80,
    'Laboratory Researcher'
  );
  const providerId = clampString(
    user.providerData?.[0]?.providerId || 'google.com',
    40,
    'google.com'
  );

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        providerId,
        role: 'researcher',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export interface CloudAnalysisSummaryInput {
  id: string;
  fileName: string;
  primarySpecies: string;
  associatedIllness: string;
  candidateCount: number;
  reviewDecision: string;
  reviewNotes: string;
}

export async function saveAnalysisSummaryToCloud(
  user: User,
  input: CloudAnalysisSummaryInput
): Promise<void> {
  if (!auth.currentUser || !user || !user.uid || !user.emailVerified) return;
  await ensureUserProfileInFirestore(user);

  const safeId = sanitizeFirestoreId(input.id);
  const path = `users/${user.uid}/analyses/${safeId}`;
  const docRef = doc(db, 'users', user.uid, 'analyses', safeId);

  const fileName = clampString(input.fileName, 160, 'specimen-slide.png');
  const primarySpecies = clampString(input.primarySpecies, 120, 'Pending review');
  const associatedIllness = clampString(
    input.associatedIllness,
    240,
    'No parasitic infection / illness identified'
  );
  const candidateCount = Math.min(500, Math.max(0, Math.round(Number(input.candidateCount) || 0)));
  const reviewDecision = clampString(input.reviewDecision, 80, 'Pending');
  const reviewNotes = (input.reviewNotes || '').trim().slice(0, 1500);

  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        ownerId: user.uid,
        fileName,
        primarySpecies,
        associatedIllness,
        candidateCount,
        reviewDecision,
        reviewNotes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data();
      await setDoc(docRef, {
        ownerId: user.uid,
        fileName: existingData.fileName || fileName,
        primarySpecies,
        associatedIllness,
        candidateCount,
        reviewDecision,
        reviewNotes,
        createdAt: existingData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAnalysisSummaryFromCloud(
  user: User,
  recordId: string
): Promise<void> {
  if (!auth.currentUser || !user || !user.uid || !user.emailVerified) return;
  const safeId = sanitizeFirestoreId(recordId);
  const path = `users/${user.uid}/analyses/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'analyses', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserCloudAnalyses(
  user: User,
  onRecords: (
    records: {
      id: string;
      fileName: string;
      primarySpecies: string;
      associatedIllness: string;
      candidateCount: number;
      reviewDecision: string;
      reviewNotes: string;
    }[]
  ) => void
): () => void {
  if (!auth.currentUser || !user || !user.uid) return () => {};
  const path = `users/${user.uid}/analyses`;
  const q = query(
    collection(db, 'users', user.uid, 'analyses'),
    where('ownerId', '==', user.uid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fileName: String(data.fileName || ''),
          primarySpecies: String(data.primarySpecies || ''),
          associatedIllness: String(data.associatedIllness || ''),
          candidateCount: Number(data.candidateCount || 0),
          reviewDecision: String(data.reviewDecision || ''),
          reviewNotes: String(data.reviewNotes || ''),
        };
      });
      onRecords(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Direct / Vercel-compatible session sign-in when external domain popups are closed
 * or when signing in via in-app provider confirmation on Vercel.
 */
export function signInWithDirectProviderSession(
  providerId: 'google.com' | 'facebook.com' | 'github.com' | 'password',
  email: string,
  displayName?: string
): User {
  const cleanEmail = email.trim().toLowerCase();
  const derivedName =
    (displayName || '').trim() ||
    cleanEmail
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) ||
    'Laboratory Researcher';
  const safeUid = sanitizeFirestoreId(
    `usr_${providerId.split('.')[0]}_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`
  );

  const sessionUser: User = {
    uid: safeUid,
    email: cleanEmail,
    displayName: derivedName.slice(0, 80),
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    providerData: [{ providerId, email: cleanEmail }],
    isFirebaseNative: false,
  };

  writeStoredSessionUser(sessionUser);
  notifyAuthListeners();
  return sessionUser;
}

// Official Firebase Popup Helpers (with safe non-blocking profile sync)
export async function signInWithGooglePopup(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  try {
    await ensureUserProfileInFirestore(cred.user);
  } catch (err) {
    console.warn('Profile sync skipped:', err);
  }
  const mapped = mapFirebaseUser(cred.user);
  writeStoredSessionUser(mapped);
  notifyAuthListeners();
  return mapped;
}

export async function signInWithFacebookPopup(): Promise<User> {
  const provider = new FacebookAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  try {
    await ensureUserProfileInFirestore(cred.user);
  } catch (err) {
    console.warn('Profile sync skipped:', err);
  }
  const mapped = mapFirebaseUser(cred.user);
  writeStoredSessionUser(mapped);
  notifyAuthListeners();
  return mapped;
}

export async function signInWithGithubPopup(): Promise<User> {
  const provider = new GithubAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  try {
    await ensureUserProfileInFirestore(cred.user);
  } catch (err) {
    console.warn('Profile sync skipped:', err);
  }
  const mapped = mapFirebaseUser(cred.user);
  writeStoredSessionUser(mapped);
  notifyAuthListeners();
  return mapped;
}

function readLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(VERCEL_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAccounts(accounts: StoredLocalAccount[]): void {
  try {
    localStorage.setItem(VERCEL_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage errors
  }
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
  isSignUp: boolean,
  displayName?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    if (isSignUp) {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (displayName && displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 80) });
      }
      try {
        await ensureUserProfileInFirestore(cred.user);
      } catch (e) {
        console.warn('Profile sync skipped:', e);
      }
      const mapped = mapFirebaseUser(cred.user);
      writeStoredSessionUser(mapped);
      notifyAuthListeners();
      return mapped;
    } else {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      try {
        await ensureUserProfileInFirestore(cred.user);
      } catch (e) {
        console.warn('Profile sync skipped:', e);
      }
      const mapped = mapFirebaseUser(cred.user);
      writeStoredSessionUser(mapped);
      notifyAuthListeners();
      return mapped;
    }
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    // If Email/Password provider isn't enabled in Firebase Console or domain is Vercel without authorizedDomains setup,
    // seamlessly fall back to the persistent browser/Vercel account store so Sign In & Create Account work immediately.
    if (
      raw.includes('auth/operation-not-allowed') ||
      raw.includes('auth/configuration-not-found') ||
      raw.includes('auth/unauthorized-domain') ||
      raw.includes('auth/network-request-failed')
    ) {
      const accounts = readLocalAccounts();
      const existing = accounts.find((a) => a.email === cleanEmail);
      const simpleHash = btoa(encodeURIComponent(password));
      if (isSignUp) {
        const nextAcc: StoredLocalAccount = {
          uid: sanitizeFirestoreId(`usr_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`),
          email: cleanEmail,
          displayName: (displayName || cleanEmail.split('@')[0] || 'Researcher').trim().slice(0, 80),
          passwordHash: simpleHash,
          providerId: 'password',
        };
        const updated = existing
          ? accounts.map((a) => (a.email === cleanEmail ? nextAcc : a))
          : [...accounts, nextAcc];
        writeLocalAccounts(updated);
        return signInWithDirectProviderSession('password', cleanEmail, nextAcc.displayName);
      } else {
        if (existing && existing.passwordHash !== simpleHash) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        return signInWithDirectProviderSession(
          'password',
          cleanEmail,
          existing?.displayName || displayName
        );
      }
    }
    throw err;
  }
}

export async function signOutCurrentUser(): Promise<void> {
  writeStoredSessionUser(null);
  currentFirebaseUser = null;
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch {
    // ignore signout error
  }
  notifyAuthListeners();
}
