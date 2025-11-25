// Simple IndexedDB wrapper for redirects store
// Usage: import { initDB, addRedirect, getAllRedirects, updateRedirect, clearAllRedirects } from './db.js'

const DB_NAME = 'redirects-db';
const DB_VERSION = 1;
const STORE_NAME = 'redirects';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'unique_id' });
        store.createIndex('url_origin_idx', 'url_origin', { unique: false });
        store.createIndex('active_idx', 'active', { unique: false });
      }
    };
    req.onsuccess = (ev) => resolve(ev.target.result);
    req.onerror = (ev) => reject(ev.target.error);
  });
}

async function withStore(mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    try {
      result = callback(store);
    } catch (err) {
      reject(err);
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = (ev) => reject(ev.target.error);
  });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function defaultsForRedirect(r) {
  return Object.assign({
    unique_id: makeId(),
    url_origin: '',
    url_dest: '',
    http_status: '301',
    pathname_only: true,
    flag_qsd: false,
    active: true,
    duplicated: false,
    malformed: false,
    rewriterule: ''
  }, r || {});
}

export async function initDB() {
  await openDB();
}

/**
 * Add a redirect object. The object will be merged with defaults.
 * @param {Object} redirect
 * @returns {Promise<Object>} Saved object
 */
export async function addRedirect(redirect) {
  const r = defaultsForRedirect(redirect);
  return withStore('readwrite', (store) => {
    store.add(r);
    return r;
  });
}

/**
 * Get all redirects
 * @returns {Promise<Array>}
 */
export async function getAllRedirects() {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Update a redirect (full object)
 * @param {Object} redirect
 * @returns {Promise<Object>}
 */
export async function updateRedirect(redirect) {
  const r = defaultsForRedirect(redirect);
  return withStore('readwrite', (store) => {
    store.put(r);
    return r;
  });
}

/**
 * Clear all entries in the store
 */
export async function clearAllRedirects() {
  return withStore('readwrite', (store) => {
    store.clear();
    return true;
  });
}

/**
 * Get only active redirects (active===true)
 */
export async function getActiveRedirects() {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const index = store.index('active_idx');
      const req = index.getAll(true);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}