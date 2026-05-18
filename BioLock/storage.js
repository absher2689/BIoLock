const DB_NAME = 'BioLock_DB';
const DB_VERSION = 1;
const STORE_SAMPLES = 'samples';
const STORE_PROFILES = 'profiles';
const STORE_LOGS = 'security_logs';

export class StorageManager {
    constructor() {
        this.db = null;
    }
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('Storage: Database error', event.target.error);
                reject(event.target.error);
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Storage: Database initialized');
                resolve(this.db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_SAMPLES)) {
                    db.createObjectStore(STORE_SAMPLES, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(STORE_PROFILES)) {
                    db.createObjectStore(STORE_PROFILES, { keyPath: 'profileId' });
                }
                if (!db.objectStoreNames.contains(STORE_LOGS)) {
                    db.createObjectStore(STORE_LOGS, { keyPath: 'timestamp' });
                }
            };
        });
    }
    async saveSample(sample) {
        return this._op(STORE_SAMPLES, 'readwrite', (store) => store.add(sample));
    }
    async getAllSamples() {
        return this._op(STORE_SAMPLES, 'readonly', (store) => store.getAll());
    }
    async clearSamples() {
        return this._op(STORE_SAMPLES, 'readwrite', (store) => store.clear());
    }
    async clearProfiles() {
        return this._op(STORE_PROFILES, 'readwrite', (store) => store.clear());
    }
    async saveProfile(profile) {
        return this._op(STORE_PROFILES, 'readwrite', (store) => store.put(profile));
    }
    async getProfile(profileId = 'default') {
        return this._op(STORE_PROFILES, 'readonly', (store) => store.get(profileId));
    }
    async getAllProfiles() {
        return this._op(STORE_PROFILES, 'readonly', (store) => store.getAll());
    }
    async logEvent(type, details) {
        const log = {
            timestamp: Date.now(),
            type,
            details
        };
        return this._op(STORE_LOGS, 'readwrite', (store) => store.add(log));
    }
    _op(storeName, mode, callback) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            const request = callback(store);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
