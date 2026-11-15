import { LIMITS, clone } from './schema.js';
export const STORES = ['characters', 'generations', 'presets', 'images', 'settings'];
export const DEFAULT_SETTINGS = { theme: 'light', high: 90, moderate: 75, candidateCount: 20, scope: 'both' };
let database;
export function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('Browser นี้ไม่รองรับ IndexedDB กรุณาใช้ browser ปกติและเปิดผ่าน local server'));
    const request = indexedDB.open('character-dna-studio-v1', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) {
        const store = db.createObjectStore(name, { keyPath: 'id' });
        for (const key of ['createdAt', 'characterId', 'project', 'archetype']) store.createIndex(key, key);
      }
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('ปิดหน้าต่างเครื่องมือเก่าก่อนอัปเดตฐานข้อมูล'));
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}
export function readAll() {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES, 'readonly'), data = {};
    for (const name of STORES) {
      const request = transaction.objectStore(name).getAll();
      request.onsuccess = () => { data[name] = request.result; };
    }
    transaction.oncomplete = () => resolve(data);
    transaction.onerror = () => reject(transaction.error);
  });
}
export function commit(changes) {
  return new Promise((resolve, reject) => {
    if (!database) return reject(new Error('พื้นที่จัดเก็บยังไม่พร้อม ร่างยังอยู่ในหน้านี้ กรุณา Export JSON เก็บไว้'));
    const names = [...new Set(changes.map(change => change.store))];
    let transaction;
    const fail = error => reject(new Error(error?.name === 'QuotaExceededError' ? 'พื้นที่ Browser เต็ม กรุณา Export Backup แล้วลบรายการที่ไม่ใช้' : 'บันทึกไม่สำเร็จ ร่างยังอยู่ กรุณา Export สำรอง'));
    try { transaction = database.transaction(names, 'readwrite'); } catch (error) { fail(error); return; }
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(new Error(transaction.error?.name === 'QuotaExceededError' ? 'พื้นที่ Browser เต็ม กรุณา Export Backup แล้วลบรายการที่ไม่ใช้' : 'บันทึกไม่สำเร็จ ร่างยังอยู่ กรุณา Export สำรอง'));
    try {
      for (const change of changes) {
        const store = transaction.objectStore(change.store);
        if (change.remove) store.delete(change.id);
        else store.put(clone(change.record));
      }
    } catch (error) { try { transaction.abort(); } catch { /* Already aborted by the storage engine. */ } fail(error); }
  });
}
export function ensureCapacity(name, current, additional = 1) {
  if (LIMITS[name] && current + additional > LIMITS[name]) throw new Error(`ถึงขีดจำกัด ${LIMITS[name]} รายการแล้ว กรุณาสำรองและลบรายการที่ไม่ใช้ก่อน`);
}
