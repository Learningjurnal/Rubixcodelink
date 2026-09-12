import { LinkItem, AppSettings } from '../types';

const DB_NAME = 'rubixxxlink_local_db_v1';
const STORE_NAME = 'links_store';
const DB_VERSION = 1;

/**
 * Open or upgrade the local IndexedDB instance
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save massive dataset (29.000+ items) into IndexedDB without browser memory lag
 */
export async function saveLinksToIndexedDb(links: LinkItem[]): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // Clear existing records first to maintain consistency
      store.clear();

      for (const item of links) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save links to IndexedDB:', err);
  }
}

/**
 * Retrieve all links from IndexedDB in sub-second speed
 */
export async function getLinksFromIndexedDb(): Promise<LinkItem[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const result = req.result;
        if (Array.isArray(result) && result.length > 0) {
          // Sort descending by createdAt
          result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          resolve(result);
        } else {
          resolve([]);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read links from IndexedDB:', err);
    return [];
  }
}

/**
 * Clear the local IndexedDB store completely
 */
export async function clearLinksFromIndexedDb(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not clear IndexedDB store:', err);
  }
}

/**
 * Backup the entire database (all items + current settings) to a downloadable JSON file
 */
export function exportDatabaseBackupJson(items: LinkItem[], settings?: AppSettings) {
  const payload = {
    app: 'Rubixxxlink',
    version: '2.5',
    exportDate: new Date().toISOString(),
    totalLinks: items.length,
    settings: settings || null,
    links: items,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rubixxxlink_Database_Backup_${items.length}_links_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate a restored database backup JSON
 */
export function parseDatabaseBackupJson(jsonString: string): {
  links: LinkItem[];
  settings?: AppSettings;
} {
  const parsed = JSON.parse(jsonString);

  let rawLinks: any[] = [];
  if (Array.isArray(parsed)) {
    rawLinks = parsed;
  } else if (parsed && Array.isArray(parsed.links)) {
    rawLinks = parsed.links;
  } else {
    throw new Error('Format berkas JSON backup tidak valid atau tidak memiliki daftar tautan.');
  }

  const validLinks: LinkItem[] = rawLinks
    .filter(item => item && (item.link || item.id))
    .map(item => ({
      id: item.id || `restored_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: item.name || '',
      link: item.link || '',
      status: item.status || 'Blank',
      output: item.output || 'Single',
      region: item.region || 'LIVE',
      note: item.note || '',
      tag: item.tag || '',
      counta: typeof item.counta === 'number' ? item.counta : 1,
      diperbarui: item.diperbarui || new Date().toISOString().slice(0, 10),
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      downloadedAt: item.downloadedAt || undefined,
      userEmail: item.userEmail || undefined,
    }));

  return {
    links: validLinks,
    settings: parsed.settings || undefined,
  };
}
