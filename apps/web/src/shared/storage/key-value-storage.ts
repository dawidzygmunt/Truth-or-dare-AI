import { createStore, del, get, set, type UseStore } from 'idb-keyval';

const DATABASE = 'tod';
const OBJECT_STORE = 'key-value';

/** Loaded values are `unknown` on purpose: they may come from an older app version. */
export interface KeyValueStorage<T> {
  load(): Promise<unknown>;
  save(value: T): Promise<void>;
  clear(): Promise<void>;
}

/** One IndexedDB entry. Every failure, also a missing IndexedDB, surfaces as a rejected promise. */
export function createKeyValueStorage<T>(key: string): KeyValueStorage<T> {
  let store: UseStore | undefined;
  const openStore = () => (store ??= createStore(DATABASE, OBJECT_STORE));

  return {
    load: async () => get<unknown>(key, openStore()),
    save: async (value) => set(key, value, openStore()),
    clear: async () => del(key, openStore()),
  };
}
