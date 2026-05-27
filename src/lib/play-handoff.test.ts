import {
  parsePlayItems,
  readPlayItemsFromSearchParams,
  readPlayItemsHandoff,
  savePlayItemsHandoff,
} from './play-handoff';
import { SearchResult } from './types';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class ThrowingStorage {
  getItem(): string | null {
    throw new Error('storage unavailable');
  }

  setItem(): void {
    throw new Error('storage unavailable');
  }
}

const item: SearchResult = {
  id: 'tintin-tv',
  title: 'Tintin TV',
  poster: '',
  episodes: ['https://example.com/video.m3u8'],
  source: 'source-a',
  source_name: 'Source A',
  year: '2026',
};

describe('play handoff', () => {
  it('stores play items behind a short handoff key', () => {
    const storage = new MemoryStorage();
    const key = savePlayItemsHandoff([item], {
      storage,
      now: () => 123,
      random: () => 0.5,
    });

    expect(key).toBe('3f-i');
    expect(readPlayItemsHandoff(key, { storage })).toEqual([item]);
  });

  it('reads handoff items from search params before legacy items', () => {
    const storage = new MemoryStorage();
    const key = savePlayItemsHandoff([item], {
      storage,
      now: () => 123,
      random: () => 0.5,
    });
    const legacy = encodeURIComponent(JSON.stringify([{ ...item, id: 'old' }]));

    const params = new URLSearchParams();
    params.set('itemsKey', key || '');
    params.set('items', legacy);

    expect(readPlayItemsFromSearchParams(params, { storage })).toEqual([item]);
  });

  it('keeps compatibility with legacy encoded items URLs', () => {
    const legacy = encodeURIComponent(JSON.stringify([item]));

    expect(parsePlayItems(legacy)).toEqual([item]);
  });

  it('falls back when browser storage is unavailable', () => {
    const storage = new ThrowingStorage();

    expect(savePlayItemsHandoff([item], { storage })).toBeNull();
    expect(readPlayItemsHandoff('missing', { storage })).toBeNull();
  });

  it('returns null for invalid handoff payloads', () => {
    expect(parsePlayItems('{"not":"an array"}')).toBeNull();
    expect(parsePlayItems('not-json')).toBeNull();
  });
});
