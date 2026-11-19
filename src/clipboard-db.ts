import type { ClipRecord } from "./clipboard-model";
let database: Promise<IDBDatabase> | undefined;
export function clipDB(): Promise<IDBDatabase> {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("tabharbor-clipboard", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("clips", { keyPath: "id" });
    request.onerror = () => reject(Error("clipStorage"));
    request.onblocked = () => reject(Error("clipStorage"));
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
  }));
}
export async function getClips(): Promise<ClipRecord[]> {
  const db = await clipDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clips", "readonly"),
      request = tx.objectStore("clips").getAll();
    request.onsuccess = () => resolve(request.result as ClipRecord[]);
    request.onerror = () => reject(Error("clipStorage"));
  });
}
export async function commitClips(
  put: ClipRecord[],
  remove: string[],
  clear = false,
): Promise<void> {
  const db = await clipDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clips", "readwrite"),
      store = tx.objectStore("clips");
    if (clear) store.clear();
    for (const id of remove) store.delete(id);
    for (const record of put) store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(Error("clipStorage"));
    tx.onabort = () => reject(Error("clipStorage"));
  });
}
