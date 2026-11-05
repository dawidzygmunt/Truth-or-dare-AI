import type { KeyValueStorage } from '../shared/storage/key-value-storage.js';

export interface MemoryStorage<T> extends KeyValueStorage<T> {
  stored: unknown;
  saves: number;
}

/** In-memory port implementation. Values go through JSON, like a real persisted game. */
export function createMemoryStorage<T>(stored?: unknown): MemoryStorage<T> {
  return {
    stored,
    saves: 0,
    load() {
      return Promise.resolve(this.stored);
    },
    save(value) {
      this.stored = JSON.parse(JSON.stringify(value));
      this.saves += 1;
      return Promise.resolve();
    },
    clear() {
      this.stored = undefined;
      return Promise.resolve();
    },
  };
}

/** Behaves like IndexedDB in a private window: every operation fails. */
export function createBrokenStorage<T>(): KeyValueStorage<T> {
  const fail = () => Promise.reject(new DOMException('denied', 'SecurityError'));
  return { load: fail, save: fail, clear: fail };
}
