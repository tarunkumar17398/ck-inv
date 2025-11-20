import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface InventoryDB extends DBSchema {
  items: {
    key: string;
    value: any;
  };
  categories: {
    key: string;
    value: any;
  };
  pendingOperations: {
    key: number;
    value: {
      id: number;
      type: 'insert' | 'update' | 'delete';
      table: string;
      data: any;
      timestamp: number;
    };
  };
}

let dbInstance: IDBPDatabase<InventoryDB> | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<InventoryDB>('inventory-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingOperations')) {
        db.createObjectStore('pendingOperations', { keyPath: 'id', autoIncrement: true });
      }
    },
  });

  return dbInstance;
}

export async function saveToLocal(storeName: 'items' | 'categories', data: any[]) {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all(data.map(item => tx.store.put(item)));
  await tx.done;
}

export async function getFromLocal(storeName: 'items' | 'categories') {
  const db = await getDB();
  return await db.getAll(storeName);
}

export async function addPendingOperation(type: 'insert' | 'update' | 'delete', table: string, data: any) {
  const db = await getDB();
  await db.add('pendingOperations', {
    id: Date.now(),
    type,
    table,
    data,
    timestamp: Date.now(),
  });
}

export async function getPendingOperations() {
  const db = await getDB();
  return await db.getAll('pendingOperations');
}

export async function clearPendingOperations() {
  const db = await getDB();
  const tx = db.transaction('pendingOperations', 'readwrite');
  await tx.store.clear();
  await tx.done;
}
