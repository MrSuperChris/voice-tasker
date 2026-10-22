// Durable home for a single in-flight recording, so a transcription failure or a
// reload during PROCESSING no longer drops the spoken thought (failure-paths cases
// A1-A3, B1-B2, E2). The blob is saved before Groq is called and cleared the moment
// a transcript reaches REVIEW; nothing accumulates. Plain IndexedDB, no dependency.
//
// clear() deletes the whole database rather than just the record, so a successful
// capture leaves no 'voice-tasker-recording' entry in indexedDB.databases() at all —
// "holds no saved blob" is then literally true, not "the store exists but is empty".

const DB_NAME = 'voice-tasker-recording';
const STORE = 'pending';
const KEY = 'current';

function withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const open = indexedDB.open(DB_NAME, 1);
        open.onupgradeneeded = () => {
            if (!open.result.objectStoreNames.contains(STORE)) {
                open.result.createObjectStore(STORE);
            }
        };
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(STORE, mode);
            const req = fn(tx.objectStore(STORE));
            tx.oncomplete = () => { db.close(); resolve(req.result as T); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        };
    });
}

export async function saveRecording(blob: Blob): Promise<void> {
    await withStore('readwrite', store => store.put(blob, KEY));
}

export async function loadRecording(): Promise<Blob | null> {
    try {
        // Don't call indexedDB.open on a cold start — it would create an empty database
        // just by reading, leaving a phantom 'voice-tasker-recording' in the browser
        // after every successful capture. Check the database list first where available.
        if (indexedDB.databases) {
            const dbs = await indexedDB.databases();
            if (!dbs.some(d => d.name === DB_NAME)) return null;
        }
        const blob = await withStore<Blob | undefined>('readonly', store => store.get(KEY));
        return blob ?? null;
    } catch {
        // A browser with IndexedDB blocked (private mode, etc.) must not crash the
        // start screen — treat it as "nothing saved".
        return null;
    }
}

export function clearRecording(): Promise<void> {
    return new Promise(resolve => {
        const del = indexedDB.deleteDatabase(DB_NAME);
        // Resolve regardless: a failed/blocked delete must not wedge the UI, and the
        // next save overwrites the single key anyway.
        del.onsuccess = () => resolve();
        del.onerror = () => resolve();
        del.onblocked = () => resolve();
    });
}
