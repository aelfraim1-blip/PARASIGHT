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
  onAuthStateChanged,
  type User,
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
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
 * Ensures the signed-in user has a valid UserPublicProfile document at /users/{uid}
 * adhering to firebase-blueprint.json constraints.
 */
export async function ensureUserProfileInFirestore(user: User): Promise<void> {
  if (!user || !user.uid || !user.emailVerified) return;
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
  if (!user || !user.uid || !user.emailVerified) return;
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
  if (!user || !user.uid || !user.emailVerified) return;
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
  onRecords: (records: { id: string; fileName: string; primarySpecies: string; associatedIllness: string; candidateCount: number; reviewDecision: string; reviewNotes: string }[]) => void
): () => void {
  if (!user || !user.uid) return () => {};
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

// Authentication Helpers
export async function signInWithGooglePopup(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  await ensureUserProfileInFirestore(cred.user);
  return cred.user;
}

export async function signInWithFacebookPopup(): Promise<User> {
  const provider = new FacebookAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await ensureUserProfileInFirestore(cred.user);
  return cred.user;
}

export async function signInWithGithubPopup(): Promise<User> {
  const provider = new GithubAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await ensureUserProfileInFirestore(cred.user);
  return cred.user;
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
  isSignUp: boolean,
  displayName?: string
): Promise<User> {
  if (isSignUp) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 80) });
    }
    await ensureUserProfileInFirestore(cred.user);
    return cred.user;
  } else {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await ensureUserProfileInFirestore(cred.user);
    return cred.user;
  }
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User };
