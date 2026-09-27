/**
 * Persistent Browser Audio Storage using IndexedDB
 * Ensures generated audio for any part/scene survives page refreshes and browser restarts.
 */

export interface AudioCacheRecord {
  key: string; // Composite unique key: e.g. `${voicePersona}-${characterKey}-${trimmedText}`
  storyId?: string;
  sceneId?: string;
  actNumber?: number;
  voicePersona: string;
  characterKey: string;
  textSnippet: string;
  audioBase64: string;
  sampleRate: number;
  durationSec?: number;
  createdAt: number;
}

const DB_NAME = 'StorytellerAudioDB_v1';
const DB_VERSION = 1;
const STORE_NAME = 'audio_segments';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('storyId', 'storyId', { unique: false });
          store.createIndex('voicePersona', 'voicePersona', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

// Storage event listeners for reactive UI updates across components
type StorageChangeListener = () => void;
const listeners: Set<StorageChangeListener> = new Set();

export function subscribeToAudioStorage(listener: StorageChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyStorageChange() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error('Storage listener error:', err);
    }
  });
}

/**
 * Generate standard cache key for a dialogue or narrative line
 */
export function getSceneCacheKey(voicePersona: string, characterKey: string, text: string): string {
  return `${voicePersona.trim()}-${characterKey.trim()}-${text.trim()}`;
}

/**
 * Save audio segment to IndexedDB
 */
export async function saveAudioToStorage(record: AudioCacheRecord): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    notifyStorageChange();
  } catch (error) {
    console.warn('Failed to save audio to IndexedDB:', error);
  }
}

/**
 * Retrieve audio segment by its key from IndexedDB
 */
export async function getAudioFromStorage(key: string): Promise<AudioCacheRecord | null> {
  try {
    const db = await getDB();
    return await new Promise<AudioCacheRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn('Failed to get audio from IndexedDB:', error);
    return null;
  }
}

/**
 * Check if a key exists in IndexedDB
 */
export async function hasAudioInStorage(key: string): Promise<boolean> {
  try {
    const db = await getDB();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count(IDBKeyRange.only(key));

      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    return false;
  }
}

/**
 * Get all stored cache keys
 */
export async function getAllAudioKeysFromStorage(): Promise<Set<string>> {
  try {
    const db = await getDB();
    return await new Promise<Set<string>>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const keys = new Set<string>((req.result as string[]).map((k) => String(k)));
        resolve(keys);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    return new Set<string>();
  }
}

/**
 * Clear all cached audio from IndexedDB
 */
export async function clearAudioStorage(): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    notifyStorageChange();
  } catch (error) {
    console.warn('Failed to clear audio storage:', error);
  }
}

/**
 * Get statistics of cached audio (total items and approx size)
 */
export async function getAudioStorageStats(): Promise<{ count: number; estimatedMb: number }> {
  try {
    const db = await getDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result as AudioCacheRecord[];
        let totalChars = 0;
        items.forEach((item) => {
          totalChars += item.audioBase64?.length || 0;
        });
        const estimatedMb = (totalChars * 0.75) / (1024 * 1024);
        resolve({
          count: items.length,
          estimatedMb: Math.round(estimatedMb * 10) / 10,
        });
      };
      req.onerror = () => resolve({ count: 0, estimatedMb: 0 });
    });
  } catch (e) {
    return { count: 0, estimatedMb: 0 };
  }
}
