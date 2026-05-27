import {
  getSearchResultGroupKey,
  groupSearchResults,
  sortSearchResults,
} from './search-results';
import { SearchResult } from './types';

function result(
  overrides: Partial<SearchResult> & Pick<SearchResult, 'title' | 'year'>
): SearchResult {
  return {
    ...overrides,
    id: overrides.id || `${overrides.title}-${overrides.year}`,
    title: overrides.title,
    poster: overrides.poster || '',
    episodes: overrides.episodes || ['https://example.com/video.m3u8'],
    source: overrides.source || 'source-a',
    source_name: overrides.source_name || 'Source A',
    year: overrides.year,
  };
}

describe('search results', () => {
  it('sorts exact title matches first, then newer known years', () => {
    const sorted = sortSearchResults(
      [
        result({ title: 'Moon Story', year: '2023' }),
        result({ title: 'Moon', year: '2020' }),
        result({ title: 'Moon', year: '2024' }),
        result({ title: 'Moon', year: 'unknown' }),
      ],
      'Moon'
    );

    expect(sorted.map((item) => `${item.title}-${item.year}`)).toEqual([
      'Moon-2024',
      'Moon-2020',
      'Moon-unknown',
      'Moon Story-2023',
    ]);
  });

  it('builds stable group keys from compact title, year, and media kind', () => {
    expect(
      getSearchResultGroupKey(
        result({ title: 'Moon TV', year: '2026', episodes: ['one'] })
      )
    ).toBe('MoonTV-2026-movie');
    expect(
      getSearchResultGroupKey(
        result({ title: 'Moon TV', year: '2026', episodes: ['one', 'two'] })
      )
    ).toBe('MoonTV-2026-tv');
  });

  it('groups equivalent results and prioritizes groups matching the query', () => {
    const groups = groupSearchResults(
      [
        result({ title: 'Other Show', year: '2026', source: 'a' }),
        result({ title: 'Moon TV', year: '2025', source: 'a' }),
        result({ title: 'Moon TV', year: '2025', source: 'b' }),
      ],
      'Moon'
    );

    expect(groups).toHaveLength(2);
    expect(groups[0][0]).toBe('MoonTV-2025-movie');
    expect(groups[0][1].map((item) => item.source)).toEqual(['a', 'b']);
  });
});
