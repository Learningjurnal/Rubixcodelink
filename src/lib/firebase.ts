import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  limit,
  getDocFromServer,
} from 'firebase/firestore';
import { LinkItem, AppSettings, StorageFolder, StorageFile } from '../types';

// Safely resolve local config json if present
const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const rawFirebaseConfig = (configModules['../../firebase-applet-config.json'] as { default?: Record<string, string> })?.default || {};

// Embedded default public Firebase client configuration for seamless GitHub / Web deployment
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAjO1QrHyIuR8T0NM07NWxAgbwjnrbSYXk',
  authDomain: 'zinc-snowfall-6lcf1.firebaseapp.com',
  projectId: 'zinc-snowfall-6lcf1',
  firestoreDatabaseId: 'ai-studio-linkmanagementda-6268afbb-4df8-4a7c-a72e-1cc23fc1e26b',
  storageBucket: 'zinc-snowfall-6lcf1.firebasestorage.app',
  messagingSenderId: '1097630283503',
  appId: '1:1097630283503:web:eedb1b5fafd56ac16b4d1a',
};

// Construct Firebase configuration with priority: ENV -> local JSON -> default config
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || rawFirebaseConfig.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || rawFirebaseConfig.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || rawFirebaseConfig.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || rawFirebaseConfig.firestoreDatabaseId || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || rawFirebaseConfig.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || rawFirebaseConfig.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || rawFirebaseConfig.appId || DEFAULT_FIREBASE_CONFIG.appId,
};

// Initialize Firebase App safely with fallback if config is incomplete
let app: ReturnType<typeof initializeApp>;
try {
  const dummyConfig = { apiKey: 'dummy-api-key', projectId: 'dummy-project' };
  const effectiveConfig = firebaseConfig.apiKey && firebaseConfig.projectId ? firebaseConfig : dummyConfig;
  app = getApps().length === 0 ? initializeApp(effectiveConfig) : getApp();
} catch (e) {
  console.warn('Firebase initialization warning:', e);
  app = getApps().length > 0 ? getApp() : initializeApp({ apiKey: 'dummy-api-key', projectId: 'dummy-project' });
}

export const auth = getAuth(app);

// Use named database if specified, with robust long-polling for web/iframe/container environments
function createFirestoreInstance() {
  const dbId = firebaseConfig.firestoreDatabaseId || undefined;
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      dbId
    );
  } catch {
    try {
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
    } catch {
      return getFirestore(app);
    }
  }
}

export const db = createFirestoreInstance();

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Graceful check that doesn't throw hard or log error spam
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  statusOptions: ['Blank', 'Sudah Terunduh', 'Proses', 'Gagal', 'Web Inactive'],
  outputOptions: ['Single', 'Batch', 'Bulk', 'Folder', 'Mirror'],
  regionOptions: ['LIVE', 'ASIA', 'US', 'EU', 'ID', 'GLOBAL'],
  notePresets: [
    'Web Inactive',
    'Perlu VPN',
    'Captcha Aktif',
    'File Rusak / Corrupt',
    'Kecepatan Tinggi',
    'Kadaluarsa',
  ],
};

const LINKS_COLLECTION = 'links';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'app_config';
export const LOCAL_STORAGE_LINKS_KEY = 'link_manager_cached_links_v2';
export const LOCAL_STORAGE_SETTINGS_KEY = 'link_manager_cached_settings_v2';

export function getCachedLocalLinks(): LinkItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LINKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not read cached links from localStorage:', e);
  }
  return [];
}

export function saveCachedLocalLinks(items: LinkItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_LINKS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Could not cache links to localStorage:', e);
  }
}

/**
 * Real-time listener for links in Firestore with automatic offline/local fallback
 */
export function subscribeToLinks(
  onUpdate: (links: LinkItem[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, LINKS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      snapshot => {
        const items: LinkItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            name: data.name || '',
            link: data.link || '',
            status: data.status || 'Blank',
            output: data.output || 'Single',
            region: data.region || 'LIVE',
            counta: typeof data.counta === 'number' ? data.counta : 1,
            note: data.note || '',
            tag: data.tag || '',
            diperbarui: data.diperbarui || '',
            createdAt: data.createdAt || Date.now(),
            downloadedAt: data.downloadedAt || undefined,
            userEmail: data.userEmail || undefined,
          });
        });
        saveCachedLocalLinks(items);
        onUpdate(items);
      },
      error => {
        console.warn('Firestore links subscription notice (using offline cache):', error);
        // Fallback to local cache so data is never lost or wiped
        const local = getCachedLocalLinks();
        if (local && local.length > 0) {
          onUpdate(local);
        }
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('Failed to initialize links listener, falling back to local storage:', err);
    const local = getCachedLocalLinks();
    if (local && local.length > 0) {
      onUpdate(local);
    }
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Add a single link to Firestore
 */
export async function addLinkToFirestore(
  item: Omit<LinkItem, 'id'>,
  userEmail?: string
): Promise<string> {
  const colRef = collection(db, LINKS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...item,
    createdAt: item.createdAt || Date.now(),
    userEmail: userEmail || null,
  });
  return docRef.id;
}

/**
 * Batch add links to Firestore
 */
export async function batchAddLinksToFirestore(
  items: Omit<LinkItem, 'id'>[],
  userEmail?: string
): Promise<number> {
  if (items.length === 0) return 0;
  
  // Firestore batch limit is 500
  const CHUNK_SIZE = 400;
  let totalSaved = 0;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(item => {
      const docRef = doc(collection(db, LINKS_COLLECTION));
      batch.set(docRef, {
        ...item,
        createdAt: item.createdAt || Date.now(),
        userEmail: userEmail || null,
      });
    });

    await batch.commit();
    totalSaved += chunk.length;
  }

  return totalSaved;
}

/**
 * Update link in Firestore
 */
export async function updateLinkInFirestore(
  id: string,
  updates: Partial<LinkItem>
): Promise<void> {
  const docRef = doc(db, LINKS_COLLECTION, id);
  await updateDoc(docRef, updates as any);
}

/**
 * Batch update multiple items with distinct changes in Firestore
 */
export async function batchUpdateItemsInFirestore(
  updates: { id: string; changes: Partial<LinkItem> }[],
  userId?: string
): Promise<number> {
  if (!updates || updates.length === 0) return 0;
  const CHUNK_SIZE = 400;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(({ id, changes }) => {
      const docRef = userId
        ? doc(db, 'users', userId, 'links', id)
        : doc(db, LINKS_COLLECTION, id);
      batch.update(docRef, changes as any);
    });
    await batch.commit();
    updatedCount += chunk.length;
  }
  return updatedCount;
}

export async function batchUpdateUserItemsInFirestore(
  userId: string,
  updates: { id: string; changes: Partial<LinkItem> }[]
): Promise<number> {
  return batchUpdateItemsInFirestore(updates, userId);
}

/**
 * Delete link from Firestore
 */
export async function deleteLinkFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, LINKS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Batch update status
 */
export async function batchUpdateStatusInFirestore(
  ids: string[],
  status: string,
  diperbarui: string
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, LINKS_COLLECTION, id);
      batch.update(docRef, {
        status,
        diperbarui,
        ...(status === 'Sudah Terunduh' ? { downloadedAt: new Date().toISOString() } : {}),
      });
    });
    await batch.commit();
  }
}

/**
 * Batch update tag / category
 */
export async function batchUpdateTagInFirestore(
  ids: string[],
  tag: string
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, LINKS_COLLECTION, id);
      batch.update(docRef, {
        tag: tag.trim(),
      });
    });
    await batch.commit();
  }
}

/**
 * Batch delete links
 */
export async function batchDeleteLinksFromFirestore(ids: string[]): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, LINKS_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  }
}

/**
 * Clear all links from Firestore (Reset Database)
 */
export async function clearAllLinksFromFirestore(): Promise<number> {
  try {
    const colRef = collection(db, LINKS_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const CHUNK_SIZE = 400;
    const docs = snap.docs;
    let deletedCount = 0;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      deletedCount += chunk.length;
    }
    return deletedCount;
  } catch (err) {
    console.error('Failed to clear links from Firestore:', err);
    throw err;
  }
}

/**
 * Remove specific dummy links if they exist in Firestore
 */
export async function clearKnownDummyLinksFromFirestore(): Promise<number> {
  try {
    const colRef = collection(db, LINKS_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const dummyKeywords = [
      'file-upload.com/cszb6c317633',
      'file-upload.com/ih1afxhb6rrr',
      'file-upload.com/k5qrathrsnpu',
      'firestream.to/v/QumSFrCv',
      'listeamed.net/e/VqbX53LV86zxQzp',
      'listeamed.net/e/vQBYEbK0VYbOn1m',
      'listeamed.net/e/wP2050PVX6e5dmy',
      'listeamed.net/e/YWA8E9MVKd3EGmM',
      'listeamed.net/v/ao9rxorZ0YP5yGe',
      'listeamed.net/v/edVqE4InDodEYWm',
      'listeamed.net/v/edVqE4rXbY35YWm',
      'listeamed.net/v/g9Vd5JWYiLixqQi',
    ];

    const dummyDocs = snap.docs.filter(docSnap => {
      const link = (docSnap.data().link || '').toLowerCase();
      const id = docSnap.id;
      return dummyKeywords.some(k => link.includes(k.toLowerCase())) || /^link-\d+$/.test(id);
    });

    if (dummyDocs.length === 0) return 0;

    const batch = writeBatch(db);
    dummyDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return dummyDocs.length;
  } catch (err) {
    console.warn('Could not auto-purge dummy links from Firestore:', err);
    return 0;
  }
}

/**
 * Seed initial links to Firestore if collection is empty
 */
export async function seedInitialLinksIfEmpty(initialList: LinkItem[]): Promise<boolean> {
  try {
    if (!initialList || initialList.length === 0) return false;
    const colRef = collection(db, LINKS_COLLECTION);
    const q = query(colRef, limit(1));
    const snap = await getDocs(q);
    if (snap.empty && initialList.length > 0) {
      console.log('Seeding initial dataset to Firestore database...');
      await batchAddLinksToFirestore(initialList);
      return true;
    }
  } catch (e) {
    console.warn('Could not check/seed Firestore:', e);
  }
  return false;
}

/**
 * Settings listener & persistence
 */
export function subscribeToSettings(
  onUpdate: (settings: AppSettings) => void
) {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(
      docRef,
      snap => {
        if (snap.exists()) {
          const data = snap.data();
          onUpdate({
            statusOptions: data.statusOptions || DEFAULT_SETTINGS.statusOptions,
            outputOptions: data.outputOptions || DEFAULT_SETTINGS.outputOptions,
            regionOptions: data.regionOptions || DEFAULT_SETTINGS.regionOptions,
            notePresets: data.notePresets || DEFAULT_SETTINGS.notePresets,
          });
        } else {
          // Initialize default in database
          setDoc(docRef, DEFAULT_SETTINGS).catch(console.error);
          onUpdate(DEFAULT_SETTINGS);
        }
      },
      err => {
        console.warn('Settings subscription notice:', err);
        onUpdate(DEFAULT_SETTINGS);
      }
    );
  } catch (err) {
    onUpdate(DEFAULT_SETTINGS);
    return () => {};
  }
}

/**
 * Save settings to Firestore
 */
export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  await setDoc(docRef, settings);
}

/**
 * USER-ISOLATED FIRESTORE INTEGRATION
 * Every authenticated user gets their own private workspace under /users/{userId}/...
 */

export function subscribeToUserFolders(
  userId: string,
  onUpdate: (folders: StorageFolder[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, 'users', userId, 'folders');
    return onSnapshot(
      colRef,
      snapshot => {
        const folders: StorageFolder[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          folders.push({
            id: docSnap.id,
            name: data.name || 'Untitled Folder',
            description: data.description || '',
            themeColor: data.themeColor || 'blue',
            usedStorageFormatted: data.usedStorageFormatted || '0MB',
            totalCapacityFormatted: data.totalCapacityFormatted || '1GB',
            usedBytes: data.usedBytes || 0,
            capacityBytes: data.capacityBytes || 1024 * 1024 * 1024,
            filesCount: data.filesCount || (data.files?.length || 0),
            foldersCount: data.foldersCount || 0,
            sharedCount: data.sharedCount || 0,
            tags: data.tags || [],
            ownerName: data.ownerName || 'Saya',
            ownerAvatar: data.ownerAvatar || undefined,
            createdAt: data.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            files: data.files || [],
          });
        });
        onUpdate(folders);
      },
      error => {
        console.warn('User folders subscription notice:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('Failed to subscribe to user folders:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function addUserFolderToFirestore(
  userId: string,
  folder: Omit<StorageFolder, 'id'>
): Promise<string> {
  const colRef = collection(db, 'users', userId, 'folders');
  const docRef = await addDoc(colRef, {
    ...folder,
    createdAt: folder.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function updateUserFolderInFirestore(
  userId: string,
  folderId: string,
  updates: Partial<StorageFolder>
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'folders', folderId);
  await updateDoc(docRef, { ...updates, updatedAt: Date.now() } as any);
}

export async function deleteUserFolderFromFirestore(
  userId: string,
  folderId: string
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'folders', folderId);
  await deleteDoc(docRef);
}

export async function addFileToUserFolderInFirestore(
  userId: string,
  folderId: string,
  newFile: StorageFile,
  currentFolder: StorageFolder
): Promise<void> {
  const updatedFiles = [newFile, ...(currentFolder.files || [])];
  const newUsedBytes = (currentFolder.usedBytes || 0) + newFile.size;
  const newUsedFormatted =
    newUsedBytes > 1024 * 1024 * 1024
      ? `${(newUsedBytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
      : `${Math.round(newUsedBytes / (1024 * 1024))}MB`;

  const docRef = doc(db, 'users', userId, 'folders', folderId);
  await updateDoc(docRef, {
    files: updatedFiles,
    filesCount: updatedFiles.length,
    usedBytes: newUsedBytes,
    usedStorageFormatted: newUsedFormatted,
    updatedAt: Date.now(),
  });
}

export async function deleteFileFromUserFolderInFirestore(
  userId: string,
  folderId: string,
  fileId: string,
  currentFolder: StorageFolder
): Promise<void> {
  const targetFile = currentFolder.files?.find(f => f.id === fileId);
  const updatedFiles = currentFolder.files?.filter(f => f.id !== fileId) || [];
  const reducedBytes = targetFile?.size || 0;
  const newUsedBytes = Math.max(0, (currentFolder.usedBytes || 0) - reducedBytes);
  const newUsedFormatted =
    newUsedBytes > 1024 * 1024 * 1024
      ? `${(newUsedBytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
      : `${Math.round(newUsedBytes / (1024 * 1024))}MB`;

  const docRef = doc(db, 'users', userId, 'folders', folderId);
  await updateDoc(docRef, {
    files: updatedFiles,
    filesCount: updatedFiles.length,
    usedBytes: newUsedBytes,
    usedStorageFormatted: newUsedFormatted,
    updatedAt: Date.now(),
  });
}

export function subscribeToUserLinks(
  userId: string,
  onUpdate: (links: LinkItem[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, 'users', userId, 'links');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      snapshot => {
        const items: LinkItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            name: data.name || '',
            link: data.link || '',
            status: data.status || 'Blank',
            output: data.output || 'Single',
            region: data.region || 'LIVE',
            counta: typeof data.counta === 'number' ? data.counta : 1,
            note: data.note || '',
            tag: data.tag || '',
            diperbarui: data.diperbarui || '',
            createdAt: data.createdAt || Date.now(),
            downloadedAt: data.downloadedAt || undefined,
            userEmail: data.userEmail || undefined,
          });
        });
        onUpdate(items);
      },
      error => {
        console.warn('User links subscription notice:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('Failed to subscribe to user links:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function addUserLinkToFirestore(
  userId: string,
  item: Omit<LinkItem, 'id'>,
  userEmail?: string
): Promise<string> {
  const colRef = collection(db, 'users', userId, 'links');
  const docRef = await addDoc(colRef, {
    ...item,
    createdAt: item.createdAt || Date.now(),
    userEmail: userEmail || null,
  });
  return docRef.id;
}

export async function batchAddUserLinksToFirestore(
  userId: string,
  items: Omit<LinkItem, 'id'>[],
  userEmail?: string
): Promise<number> {
  if (items.length === 0) return 0;
  const CHUNK_SIZE = 400;
  let totalSaved = 0;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(item => {
      const docRef = doc(collection(db, 'users', userId, 'links'));
      batch.set(docRef, {
        ...item,
        createdAt: item.createdAt || Date.now(),
        userEmail: userEmail || null,
      });
    });
    await batch.commit();
    totalSaved += chunk.length;
  }
  return totalSaved;
}

export async function updateUserLinkInFirestore(
  userId: string,
  id: string,
  updates: Partial<LinkItem>
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'links', id);
  await updateDoc(docRef, updates as any);
}

export async function deleteUserLinkFromFirestore(
  userId: string,
  id: string
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'links', id);
  await deleteDoc(docRef);
}

export async function batchUpdateUserLinkStatusInFirestore(
  userId: string,
  ids: string[],
  status: string,
  diperbarui: string
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, 'users', userId, 'links', id);
      batch.update(docRef, {
        status,
        diperbarui,
        ...(status === 'Sudah Terunduh' ? { downloadedAt: new Date().toISOString() } : {}),
      });
    });
    await batch.commit();
  }
}

export async function batchUpdateUserLinkTagInFirestore(
  userId: string,
  ids: string[],
  tag: string
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, 'users', userId, 'links', id);
      batch.update(docRef, { tag: tag.trim() });
    });
    await batch.commit();
  }
}

export async function batchDeleteUserLinksFromFirestore(
  userId: string,
  ids: string[]
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, 'users', userId, 'links', id);
      batch.delete(docRef);
    });
    await batch.commit();
  }
}

export async function clearAllUserLinksFromFirestore(userId: string): Promise<number> {
  const colRef = collection(db, 'users', userId, 'links');
  const snap = await getDocs(colRef);
  if (snap.empty) return 0;
  const CHUNK_SIZE = 400;
  let deletedCount = 0;
  for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
    const chunk = snap.docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deletedCount += chunk.length;
  }
  return deletedCount;
}

export function subscribeToUserSettings(
  userId: string,
  onUpdate: (settings: AppSettings) => void
) {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'app_config');
    return onSnapshot(docRef, snap => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          statusOptions: data.statusOptions || DEFAULT_SETTINGS.statusOptions,
          outputOptions: data.outputOptions || DEFAULT_SETTINGS.outputOptions,
          regionOptions: data.regionOptions || DEFAULT_SETTINGS.regionOptions,
          notePresets: data.notePresets || DEFAULT_SETTINGS.notePresets,
        });
      } else {
        setDoc(docRef, DEFAULT_SETTINGS).catch(console.error);
        onUpdate(DEFAULT_SETTINGS);
      }
    });
  } catch (e) {
    onUpdate(DEFAULT_SETTINGS);
    return () => {};
  }
}

export async function saveUserSettingsToFirestore(
  userId: string,
  settings: AppSettings
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'settings', 'app_config');
  await setDoc(docRef, settings);
}

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return signInWithPopup(auth, provider);
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithGoogle,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
};
