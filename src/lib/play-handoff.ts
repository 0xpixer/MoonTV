import { SearchResult } from './types';

interface HandoffStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface SearchParamsLike {
  get(key: string): string | null;
}

interface HandoffOptions {
  storage?: HandoffStorage | null;
  now?: () => number;
  random?: () => number;
}

const PLAY_ITEMS_STORAGE_PREFIX = 'moontv:play-items:';

function getBrowserSessionStorage(): HandoffStorage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

function createPlayItemsHandoffKey(options: HandoffOptions = {}): string {
  const now = options.now || Date.now;
  const random = options.random || Math.random;
  return `${now().toString(36)}-${random().toString(36).slice(2, 10)}`;
}

function storageKeyFor(handoffKey: string): string {
  return `${PLAY_ITEMS_STORAGE_PREFIX}${handoffKey}`;
}

export function savePlayItemsHandoff(
  items: SearchResult[],
  options: HandoffOptions = {}
): string | null {
  const storage = options.storage ?? getBrowserSessionStorage();
  if (!storage) return null;

  const handoffKey = createPlayItemsHandoffKey(options);
  try {
    storage.setItem(storageKeyFor(handoffKey), JSON.stringify(items));
    return handoffKey;
  } catch (_) {
    return null;
  }
}

export function readPlayItemsHandoff(
  handoffKey: string | null,
  options: HandoffOptions = {}
): SearchResult[] | null {
  if (!handoffKey) return null;

  const storage = options.storage ?? getBrowserSessionStorage();
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(storageKeyFor(handoffKey));
  } catch (_) {
    return null;
  }

  if (!raw) return null;

  return parsePlayItems(raw);
}

export function parsePlayItems(raw: string | null): SearchResult[] | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      return Array.isArray(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }
}

export function readPlayItemsFromSearchParams(
  searchParams: SearchParamsLike,
  options: HandoffOptions = {}
): SearchResult[] | null {
  const handoffItems = readPlayItemsHandoff(
    searchParams.get('itemsKey'),
    options
  );
  if (handoffItems) return handoffItems;

  return parsePlayItems(searchParams.get('items'));
}
