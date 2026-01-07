// IndexedDB-based file storage for unlimited file size and count
const DB_NAME = 'csm_file_storage';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface StoredFile {
  id: string;
  data: string; // base64 data
  fileName: string;
  type: string;
  size: number;
  createdAt: string;
}

let dbInstance: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveFileData = async (id: string, data: string, fileName: string, type: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const file: StoredFile = {
      id,
      data,
      fileName,
      type,
      size: data.length,
      createdAt: new Date().toISOString()
    };
    
    const request = store.put(file);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getFileData = async (id: string): Promise<string | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as StoredFile | undefined;
      resolve(result?.data || null);
    };
  });
};

export const deleteFileData = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const deleteMultipleFileData = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    let completed = 0;
    let hasError = false;
    
    ids.forEach(id => {
      const request = store.delete(id);
      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(request.error);
        }
      };
      request.onsuccess = () => {
        completed++;
        if (completed === ids.length && !hasError) {
          resolve();
        }
      };
    });
  });
};

export const getAllFileIds = async (): Promise<string[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as string[]);
  });
};

export const getStorageStats = async (): Promise<{ count: number; totalSize: number }> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const files = request.result as StoredFile[];
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      resolve({ count: files.length, totalSize });
    };
  });
};

export const clearAllFiles = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
