const NAME = "me-sim-companion";
const VERSION = 1;

/** @spec TECH-COMPANION-STORAGE */
function request(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @spec TECH-COMPANION-STORAGE */
function open() {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(NAME, VERSION);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      db.createObjectStore("settings");
      db.createObjectStore("operations", { keyPath: "id" });
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
}

/** @spec TECH-COMPANION-STORAGE */
async function withStore(name, mode, task) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      let result;
      try {
        result = task(tx.objectStore(name));
      } catch (error) {
        reject(error);
        return;
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** @spec TECH-COMPANION-STORAGE */
export async function getSetting(key) {
  const db = await open();
  try {
    return await request(
      db.transaction("settings", "readonly").objectStore("settings").get(key),
    );
  } finally {
    db.close();
  }
}

/** @spec TECH-COMPANION-STORAGE */
export function putSetting(key, value) {
  return withStore("settings", "readwrite", (store) => store.put(value, key));
}

/** @spec TECH-COMPANION-STORAGE */
export function addOperation(operation) {
  return withStore("operations", "readwrite", (store) => store.add(operation));
}

/** @spec TECH-COMPANION-STORAGE */
export function replaceOperation(previousId, operation) {
  return withStore("operations", "readwrite", (store) => {
    store.delete(previousId);
    store.add(operation);
  });
}

/** @spec TECH-COMPANION-STORAGE */
export function deleteOperation(id) {
  return withStore("operations", "readwrite", (store) => store.delete(id));
}

/** @spec TECH-COMPANION-STORAGE */
export async function allOperations() {
  const db = await open();
  try {
    return await request(
      db
        .transaction("operations", "readonly")
        .objectStore("operations")
        .getAll(),
    );
  } finally {
    db.close();
  }
}

/** @spec TECH-COMPANION-STORAGE */
export function updateOperations(operations, acceptedIds) {
  return withStore("operations", "readwrite", (store) => {
    for (const id of acceptedIds) store.delete(id);
    for (const operation of operations) store.put(operation);
  });
}
