import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createKeyValueStorage } from './key-value-storage.js';

describe('createKeyValueStorage', () => {
  it('reads back what was saved', async () => {
    const storage = createKeyValueStorage('round-trip');

    await storage.save({ version: 1, players: ['Ola'] });

    expect(await storage.load()).toEqual({ version: 1, players: ['Ola'] });
  });

  it('returns undefined when nothing was saved', async () => {
    expect(await createKeyValueStorage('empty').load()).toBeUndefined();
  });

  it('forgets a cleared value', async () => {
    const storage = createKeyValueStorage('cleared');
    await storage.save('value');

    await storage.clear();

    expect(await storage.load()).toBeUndefined();
  });

  it('rejects instead of throwing synchronously when IndexedDB is missing', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const storage = createKeyValueStorage('missing');

    await expect(storage.save('value')).rejects.toThrow();
    await expect(storage.load()).rejects.toThrow();
    await expect(storage.clear()).rejects.toThrow();
  });
});
