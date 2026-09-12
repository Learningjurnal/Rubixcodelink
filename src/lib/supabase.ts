import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { LinkItem, AppSettings, StorageFolder, StorageFile } from '../types';

// --- Client setup ------------------------------------------------------
//
// Unlike the old firebase.ts, there is NO hardcoded fallback project here
// on purpose (see the production-readiness audit: a checked-in real key +
// open rules previously leaked full read/write access to anyone). Every
// deployment must supply its own VITE_SUPABASE_* env vars.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasRealConfig = Boolean(supabaseUrl && supabaseAnonKey);
if (!hasRealConfig) {
  console.warn(
    'Supabase config is missing (no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set). ' +
      'Auth and data sync will not work until the deployment env is configured.'
  );
}

// Dummy placeholder so the client can still be constructed (and the app
// can render the login screen) when env vars are missing, instead of
// crashing the whole page at import time.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// `auth` exists only so call sites that historically took a Firebase
// `auth` instance as their first argument (signInWithEmailAndPassword(auth,
// ...), onAuthStateChanged(auth, ...), signOut(auth)) keep compiling
// unchanged. The wrappers below ignore it and talk to `supabase.auth`
// directly — it is not a real Supabase concept.
export const auth = supabase;

// --- Firebase-shaped User, for minimal changes in App.tsx --------------

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

function toAppUser(supaUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
} | null): User | null {
  if (!supaUser) return null;
  return {
    uid: supaUser.id,
    email: supaUser.email ?? null,
    displayName: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || null,
  };
}

/**
 * Supabase auth errors don't carry Firebase-style `error.code` strings
 * (e.g. 'auth/wrong-password'). The two auth screens in this app branch on
 * those exact codes for user-facing Indonesian messages, so translate the
 * common Supabase/GoTrue error messages into the closest Firebase code
 * instead of rewriting that UI logic.
 */
function mapSupabaseAuthError(error: { message?: string; status?: number } | null): Error & { code: string } {
  const message = error?.message || 'Terjadi kesalahan autentikasi.';
  const lower = message.toLowerCase();
  let code = 'auth/unknown';

  if (lower.includes('invalid login credentials')) code = 'auth/invalid-credential';
  else if (lower.includes('already registered')) code = 'auth/email-already-in-use';
  else if (lower.includes('password') && lower.includes('least')) code = 'auth/weak-password';
  else if (lower.includes('unable to validate email') || lower.includes('invalid email')) code = 'auth/invalid-email';
  else if (lower.includes('signups not allowed') || lower.includes('email logins are disabled')) {
    code = 'auth/operation-not-allowed';
  }

  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

export async function signInWithEmailAndPassword(_authIgnored: unknown, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw mapSupabaseAuthError(error);
  if (!data.session) {
    // Should not happen for signInWithPassword (it always returns a
    // session on success), but guard anyway: a "successful" call with no
    // real session means every subsequent Supabase read/write will be
    // silently rejected by RLS. Surface it instead of pretending to log in.
    throw mapSupabaseAuthError({ message: 'Login gagal: tidak ada sesi yang terbentuk.' });
  }
  return { user: toAppUser(data.user) as User };
}

export async function createUserWithEmailAndPassword(_authIgnored: unknown, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw mapSupabaseAuthError(error);
  // Supabase returns `session: null` (with no `error`) when signing up an
  // email that is already registered — a deliberate anti-enumeration
  // response, not a real new account. Treating that as success would let
  // the UI show "logged in" while every DB write silently fails RLS
  // (no real auth.uid()), invisible until the user notices nothing
  // persists. Surface it as "email already in use" instead.
  if (!data.session) {
    const err = new Error('Email ini sudah terdaftar, atau pendaftaran akun baru sedang dinonaktifkan.') as Error & {
      code: string;
    };
    err.code = 'auth/email-already-in-use';
    throw err;
  }
  return { user: toAppUser(data.user) as User };
}

/**
 * Supabase's OAuth flow is redirect-based, not a popup like Firebase's
 * signInWithPopup: calling this navigates the whole page to Google and
 * back, so the caller's `cred.user` is generally never reached (the page
 * unloads first) — the real session pickup happens in onAuthStateChanged
 * after the redirect completes. Both call sites already fall back to
 * 'Akun Google' when email is falsy, so this is a safe no-op shape.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw mapSupabaseAuthError(error);
  return { user: { uid: '', email: null, displayName: null } as User };
}

export async function signOut(_authIgnored: unknown) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChanged(_authIgnored: unknown, callback: (user: User | null) => void) {
  // Fire once with whatever session already exists (page load / refresh),
  // mirroring Firebase's behavior of invoking the callback immediately.
  supabase.auth.getSession().then(({ data }) => callback(toAppUser(data.session?.user ?? null)));

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toAppUser(session?.user ?? null));
  });
  return () => listener.subscription.unsubscribe();
}

// --- Shared default settings (unchanged from firebase.ts) --------------

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

// --- Row <-> app-type mapping -------------------------------------------

function rowToLinkItem(row: any): LinkItem {
  return {
    id: row.id,
    name: row.name || '',
    link: row.link || '',
    status: row.status || 'Blank',
    output: row.output || 'Single',
    region: row.region || 'LIVE',
    counta: typeof row.counta === 'number' ? row.counta : 1,
    note: row.note || '',
    tag: row.tag || '',
    diperbarui: row.diperbarui || '',
    createdAt: row.created_at || Date.now(),
    downloadedAt: row.downloaded_at || undefined,
    userEmail: row.user_email || undefined,
  };
}

function rowToStorageFolder(row: any): StorageFolder {
  return {
    id: row.id,
    name: row.name || 'Untitled Folder',
    description: row.description || '',
    themeColor: row.theme_color || 'blue',
    usedStorageFormatted: row.used_storage_formatted || '0MB',
    totalCapacityFormatted: row.total_capacity_formatted || '1GB',
    usedBytes: row.used_bytes || 0,
    capacityBytes: row.capacity_bytes || 1024 * 1024 * 1024,
    filesCount: row.files_count || (row.files?.length ?? 0),
    foldersCount: row.folders_count || 0,
    sharedCount: row.shared_count || 0,
    tags: row.tags || [],
    ownerName: row.owner_name || 'Saya',
    ownerAvatar: row.owner_avatar || undefined,
    createdAt: row.created_at || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    files: row.files || [],
  };
}

function rowToSettings(row: any): AppSettings {
  return {
    statusOptions: row.status_options || DEFAULT_SETTINGS.statusOptions,
    outputOptions: row.output_options || DEFAULT_SETTINGS.outputOptions,
    regionOptions: row.region_options || DEFAULT_SETTINGS.regionOptions,
    notePresets: row.note_presets || DEFAULT_SETTINGS.notePresets,
  };
}

function formatBytes(bytes: number): string {
  return bytes > 1024 * 1024 * 1024
    ? `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
    : `${Math.round(bytes / (1024 * 1024))}MB`;
}

// --- Generic "refetch on change" realtime subscription helper ----------
//
// Supabase's postgres_changes stream only gives you the row that changed,
// not a fresh full result set the way Firestore's onSnapshot does. To keep
// the onUpdate(fullList) contract every caller already relies on, each
// change event triggers a plain re-select instead of patching state
// locally. Simpler and safer than hand-rolling merge logic; the tradeoff
// is one extra round-trip per change, which is fine at this app's scale.
function subscribeToUserRows<T>(
  table: 'user_links' | 'user_folders',
  userId: string,
  mapRow: (row: any) => T,
  orderBy: { column: string; ascending: boolean } | null,
  onUpdate: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  let cancelled = false;

  async function fetchAndEmit() {
    let query = supabase.from(table).select('*').eq('user_id', userId);
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending });
    const { data, error } = await query;
    if (cancelled) return;
    if (error) {
      console.warn(`${table} subscription notice:`, error);
      onError?.(error as any);
      return;
    }
    onUpdate((data || []).map(mapRow));
  }

  fetchAndEmit();

  const channel: RealtimeChannel = supabase
    .channel(`${table}-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      () => fetchAndEmit()
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// USER-ISOLATED DATA ACCESS
// Every authenticated user owns their own rows under user_id = auth.uid(),
// enforced both here (explicit .eq('user_id', userId) filters) and by
// Postgres RLS policies (supabase/migrations/0001_init.sql) as defense in
// depth — a bug here can't leak another user's data because the database
// itself refuses it.
// =========================================================================

// ---- Links --------------------------------------------------------------

export function subscribeToUserLinks(
  userId: string,
  onUpdate: (links: LinkItem[]) => void,
  onError?: (err: Error) => void
) {
  return subscribeToUserRows('user_links', userId, rowToLinkItem, { column: 'created_at', ascending: false }, onUpdate, onError);
}

export async function addUserLinkToFirestore(
  userId: string,
  item: Omit<LinkItem, 'id'>,
  userEmail?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('user_links')
    .insert({
      user_id: userId,
      name: item.name || '',
      link: item.link,
      status: item.status,
      output: item.output,
      region: item.region,
      counta: item.counta,
      note: item.note,
      tag: item.tag || '',
      diperbarui: item.diperbarui,
      created_at: item.createdAt || Date.now(),
      downloaded_at: item.downloadedAt || null,
      user_email: userEmail || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
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
    const chunk = items.slice(i, i + CHUNK_SIZE).map(item => ({
      user_id: userId,
      name: item.name || '',
      link: item.link,
      status: item.status,
      output: item.output,
      region: item.region,
      counta: item.counta,
      note: item.note,
      tag: item.tag || '',
      diperbarui: item.diperbarui,
      created_at: item.createdAt || Date.now(),
      downloaded_at: item.downloadedAt || null,
      user_email: userEmail || null,
    }));
    const { error } = await supabase.from('user_links').insert(chunk);
    if (error) throw error;
    totalSaved += chunk.length;
  }
  return totalSaved;
}

export async function updateUserLinkInFirestore(
  userId: string,
  id: string,
  updates: Partial<LinkItem>
): Promise<void> {
  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.link !== undefined) patch.link = updates.link;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.output !== undefined) patch.output = updates.output;
  if (updates.region !== undefined) patch.region = updates.region;
  if (updates.counta !== undefined) patch.counta = updates.counta;
  if (updates.note !== undefined) patch.note = updates.note;
  if (updates.tag !== undefined) patch.tag = updates.tag;
  if (updates.diperbarui !== undefined) patch.diperbarui = updates.diperbarui;
  if (updates.downloadedAt !== undefined) patch.downloaded_at = updates.downloadedAt;

  const { error } = await supabase.from('user_links').update(patch).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/**
 * Applies distinct per-row changes in one round-trip where possible.
 * Note: unlike a Firestore writeBatch, these individual updates are not
 * committed as a single atomic transaction — if one fails partway,
 * earlier updates in the same call are not rolled back. Wrap in a
 * Postgres function via RPC later if atomicity across rows becomes
 * important.
 */
export async function batchUpdateItemsInFirestore(
  updates: { id: string; changes: Partial<LinkItem> }[],
  userId: string
): Promise<number> {
  if (!updates || updates.length === 0) return 0;
  await Promise.all(updates.map(({ id, changes }) => updateUserLinkInFirestore(userId, id, changes)));
  return updates.length;
}

export async function deleteUserLinkFromFirestore(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('user_links').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function batchUpdateUserLinkStatusInFirestore(
  userId: string,
  ids: string[],
  status: string,
  diperbarui: string
): Promise<void> {
  const CHUNK_SIZE = 400;
  const patch: Record<string, any> = { status, diperbarui };
  if (status === 'Sudah Terunduh') patch.downloaded_at = new Date().toISOString();

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('user_links').update(patch).eq('user_id', userId).in('id', chunk);
    if (error) throw error;
  }
}

export async function batchUpdateUserLinkTagInFirestore(userId: string, ids: string[], tag: string): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('user_links')
      .update({ tag: tag.trim() })
      .eq('user_id', userId)
      .in('id', chunk);
    if (error) throw error;
  }
}

export async function batchDeleteUserLinksFromFirestore(userId: string, ids: string[]): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('user_links').delete().eq('user_id', userId).in('id', chunk);
    if (error) throw error;
  }
}

export async function clearAllUserLinksFromFirestore(userId: string): Promise<number> {
  const { data, error } = await supabase.from('user_links').delete().eq('user_id', userId).select('id');
  if (error) throw error;
  return data?.length || 0;
}

// ---- Folders --------------------------------------------------------------

export function subscribeToUserFolders(
  userId: string,
  onUpdate: (folders: StorageFolder[]) => void,
  onError?: (err: Error) => void
) {
  return subscribeToUserRows('user_folders', userId, rowToStorageFolder, null, onUpdate, onError);
}

export async function addUserFolderToFirestore(userId: string, folder: Omit<StorageFolder, 'id'>): Promise<string> {
  const { data, error } = await supabase
    .from('user_folders')
    .insert({
      user_id: userId,
      name: folder.name,
      description: folder.description || '',
      theme_color: folder.themeColor,
      used_storage_formatted: folder.usedStorageFormatted,
      total_capacity_formatted: folder.totalCapacityFormatted,
      used_bytes: folder.usedBytes,
      capacity_bytes: folder.capacityBytes,
      files_count: folder.filesCount,
      folders_count: folder.foldersCount,
      shared_count: folder.sharedCount,
      tags: folder.tags || [],
      owner_name: folder.ownerName,
      owner_avatar: folder.ownerAvatar || null,
      created_at: folder.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      files: folder.files || [],
      updated_at: Date.now(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateUserFolderInFirestore(
  userId: string,
  folderId: string,
  updates: Partial<StorageFolder>
): Promise<void> {
  const patch: Record<string, any> = { updated_at: Date.now() };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.themeColor !== undefined) patch.theme_color = updates.themeColor;
  if (updates.usedStorageFormatted !== undefined) patch.used_storage_formatted = updates.usedStorageFormatted;
  if (updates.totalCapacityFormatted !== undefined) patch.total_capacity_formatted = updates.totalCapacityFormatted;
  if (updates.usedBytes !== undefined) patch.used_bytes = updates.usedBytes;
  if (updates.capacityBytes !== undefined) patch.capacity_bytes = updates.capacityBytes;
  if (updates.filesCount !== undefined) patch.files_count = updates.filesCount;
  if (updates.foldersCount !== undefined) patch.folders_count = updates.foldersCount;
  if (updates.sharedCount !== undefined) patch.shared_count = updates.sharedCount;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  if (updates.ownerName !== undefined) patch.owner_name = updates.ownerName;
  if (updates.ownerAvatar !== undefined) patch.owner_avatar = updates.ownerAvatar;
  if (updates.files !== undefined) patch.files = updates.files;

  const { error } = await supabase.from('user_folders').update(patch).eq('id', folderId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteUserFolderFromFirestore(userId: string, folderId: string): Promise<void> {
  const { error } = await supabase.from('user_folders').delete().eq('id', folderId).eq('user_id', userId);
  if (error) throw error;
}

export async function addFileToUserFolderInFirestore(
  userId: string,
  folderId: string,
  newFile: StorageFile,
  currentFolder: StorageFolder
): Promise<void> {
  const updatedFiles = [newFile, ...(currentFolder.files || [])];
  const newUsedBytes = (currentFolder.usedBytes || 0) + newFile.size;

  const { error } = await supabase
    .from('user_folders')
    .update({
      files: updatedFiles,
      files_count: updatedFiles.length,
      used_bytes: newUsedBytes,
      used_storage_formatted: formatBytes(newUsedBytes),
      updated_at: Date.now(),
    })
    .eq('id', folderId)
    .eq('user_id', userId);
  if (error) throw error;
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

  const { error } = await supabase
    .from('user_folders')
    .update({
      files: updatedFiles,
      files_count: updatedFiles.length,
      used_bytes: newUsedBytes,
      used_storage_formatted: formatBytes(newUsedBytes),
      updated_at: Date.now(),
    })
    .eq('id', folderId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ---- Settings --------------------------------------------------------------

export function subscribeToUserSettings(userId: string, onUpdate: (settings: AppSettings) => void): () => void {
  let cancelled = false;

  async function fetchAndEmit() {
    const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
    if (cancelled) return;
    if (error) {
      console.warn('user_settings subscription notice:', error);
      onUpdate(DEFAULT_SETTINGS);
      return;
    }
    if (data) {
      onUpdate(rowToSettings(data));
    } else {
      // Initialize default row, same as the Firestore version did.
      await supabase.from('user_settings').insert({
        user_id: userId,
        status_options: DEFAULT_SETTINGS.statusOptions,
        output_options: DEFAULT_SETTINGS.outputOptions,
        region_options: DEFAULT_SETTINGS.regionOptions,
        note_presets: DEFAULT_SETTINGS.notePresets,
      });
      onUpdate(DEFAULT_SETTINGS);
    }
  }

  fetchAndEmit();

  const channel = supabase
    .channel(`user_settings-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
      () => fetchAndEmit()
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export async function saveUserSettingsToFirestore(userId: string, settings: AppSettings): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    status_options: settings.statusOptions,
    output_options: settings.outputOptions,
    region_options: settings.regionOptions,
    note_presets: settings.notePresets,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
