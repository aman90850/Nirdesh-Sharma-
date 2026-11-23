import { createSeedDatabase } from '../data/seedData';
import type { ClinicDatabase } from '../types/clinic';

const DB_NAME = 'SigmaUsgDesktopDB';
const DB_VERSION = 1;
const STORE_NAME = 'kv_store';
const DATA_KEY = 'clinic_database_v2';
const FOLDER_HANDLE_KEY = 'sync_folder_handle';
const LOCAL_FALLBACK_KEY = 'sigma_usg_clinic_db_fallback_v2';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback handled by caller
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore
  }
}

export async function loadClinicDatabase(): Promise<ClinicDatabase> {
  const stored = await idbGet<ClinicDatabase>(DATA_KEY);
  if (stored && stored.schemaVersion && Array.isArray(stored.labTests)) {
    return stored;
  }

  try {
    const lsRaw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (lsRaw) {
      const parsed = JSON.parse(lsRaw) as ClinicDatabase;
      if (parsed && parsed.schemaVersion && Array.isArray(parsed.labTests)) {
        await idbSet(DATA_KEY, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore corrupted fallback
  }

  const seed = createSeedDatabase();
  await saveClinicDatabase(seed);
  return seed;
}

export async function saveClinicDatabase(db: ClinicDatabase): Promise<void> {
  const stamped: ClinicDatabase = {
    ...db,
    exportedAt: new Date().toISOString(),
  };
  await idbSet(DATA_KEY, stamped);
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(stamped));
  } catch {
    // Ignore quota limits if DB grows large; IndexedDB holds primary copy
  }
}

export async function saveFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await idbSet(FOLDER_HANDLE_KEY, handle);
}

export async function loadSavedFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  return idbGet<FileSystemDirectoryHandle>(FOLDER_HANDLE_KEY);
}

export async function clearSavedFolderHandle(): Promise<void> {
  await idbDelete(FOLDER_HANDLE_KEY);
}
