// This module must only be imported inside "use client" components
// or inside useEffect/event handlers — never at module level in Server Components

import type { Order, MenuItem, MenuCategory } from "@/lib/types";

const DB_NAME = "billmate_db";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("orders")) {
        const os = db.createObjectStore("orders", { keyPath: "id" });
        os.createIndex("by_date", "createdAt");
        os.createIndex("by_sync", "syncStatus");
      }
      if (!db.objectStoreNames.contains("menuItems")) {
        const ms = db.createObjectStore("menuItems", { keyPath: "id" });
        ms.createIndex("by_category", "categoryId");
      }
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const req = fn(t);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.onerror = () => reject(t.error);
  });
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function dbSaveOrder(order: Order): Promise<void> {
  const db = await openDB();
  await tx(db, "orders", "readwrite", (t) => t.objectStore("orders").put(order));
}

export async function dbGetAllOrders(): Promise<Order[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("orders", "readonly");
    const req = t.objectStore("orders").getAll();
    req.onsuccess = () => {
      const orders = (req.result as Order[]).sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );
      resolve(orders);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetTodaysOrders(): Promise<Order[]> {
  const all = await dbGetAllOrders();
  const today = new Date().toISOString().slice(0, 10);
  return all.filter((o) => o.createdAt.startsWith(today));
}

export async function dbGetPendingOrders(): Promise<Order[]> {
  const all = await dbGetAllOrders();
  return all.filter((o) => o.syncStatus === "pending");
}

export async function dbUpdateSyncStatus(
  id: string,
  status: Order["syncStatus"]
): Promise<void> {
  const db = await openDB();
  const order: Order | undefined = await tx(db, "orders", "readonly", (t) =>
    t.objectStore("orders").get(id)
  );
  if (order) {
    order.syncStatus = status;
    await tx(db, "orders", "readwrite", (t) =>
      t.objectStore("orders").put(order)
    );
  }
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export async function dbSaveMenuItem(item: MenuItem): Promise<void> {
  const db = await openDB();
  await tx(db, "menuItems", "readwrite", (t) =>
    t.objectStore("menuItems").put(item)
  );
}

export async function dbDeleteMenuItem(id: string): Promise<void> {
  const db = await openDB();
  await tx(db, "menuItems", "readwrite", (t) =>
    t.objectStore("menuItems").delete(id)
  );
}

export async function dbGetAllMenuItems(): Promise<MenuItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("menuItems", "readonly");
    const req = t.objectStore("menuItems").getAll();
    req.onsuccess = () => resolve(req.result as MenuItem[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbBulkSaveMenuItems(items: MenuItem[]): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("menuItems", "readwrite");
    items.forEach((item) => t.objectStore("menuItems").put(item));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function dbSaveCategory(cat: MenuCategory): Promise<void> {
  const db = await openDB();
  await tx(db, "categories", "readwrite", (t) =>
    t.objectStore("categories").put(cat)
  );
}

export async function dbDeleteCategory(id: string): Promise<void> {
  const db = await openDB();
  await tx(db, "categories", "readwrite", (t) =>
    t.objectStore("categories").delete(id)
  );
}

export async function dbGetAllCategories(): Promise<MenuCategory[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("categories", "readonly");
    const req = t.objectStore("categories").getAll();
    req.onsuccess = () => {
      const cats = (req.result as MenuCategory[]).sort(
        (a, b) => a.sortOrder - b.sortOrder
      );
      resolve(cats);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbBulkSaveCategories(cats: MenuCategory[]): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("categories", "readwrite");
    cats.forEach((cat) => t.objectStore("categories").put(cat));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
