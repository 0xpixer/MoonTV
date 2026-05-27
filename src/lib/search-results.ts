import { SearchResult } from './types';

export type SearchResultGroup = [key: string, results: SearchResult[]];

function compactTitle(title: string): string {
  return title.replaceAll(' ', '');
}

function mediaKindFor(result: SearchResult): 'movie' | 'tv' {
  return result.episodes.length === 1 ? 'movie' : 'tv';
}

function compareYearDesc(aYear: string, bYear: string): number {
  if (aYear === bYear) return 0;
  if (aYear === 'unknown' && bYear === 'unknown') return 0;
  if (aYear === 'unknown') return 1;
  if (bYear === 'unknown') return -1;
  return parseInt(aYear, 10) > parseInt(bYear, 10) ? -1 : 1;
}

function compareSearchTitleMatch(
  aTitle: string,
  bTitle: string,
  query: string,
  mode: 'exact' | 'includes'
): number {
  const normalizedQuery = compactTitle(query.trim());
  const normalize = mode === 'exact' ? (title: string) => title : compactTitle;
  const predicate =
    mode === 'exact'
      ? (title: string) => title === query.trim()
      : (title: string) => normalize(title).includes(normalizedQuery);

  const aMatches = predicate(aTitle);
  const bMatches = predicate(bTitle);

  if (aMatches && !bMatches) return -1;
  if (!aMatches && bMatches) return 1;
  return 0;
}

export function sortSearchResults(
  results: SearchResult[],
  query: string
): SearchResult[] {
  return [...results].sort((a, b) => {
    const titleMatchOrder = compareSearchTitleMatch(
      a.title,
      b.title,
      query,
      'exact'
    );
    if (titleMatchOrder !== 0) return titleMatchOrder;

    const yearOrder = compareYearDesc(a.year, b.year);
    if (yearOrder !== 0) return yearOrder;

    return a.title.localeCompare(b.title);
  });
}

export function getSearchResultGroupKey(result: SearchResult): string {
  return `${compactTitle(result.title)}-${
    result.year || 'unknown'
  }-${mediaKindFor(result)}`;
}

export function groupSearchResults(
  results: SearchResult[],
  query: string
): SearchResultGroup[] {
  const map = new Map<string, SearchResult[]>();

  results.forEach((item) => {
    const key = getSearchResultGroupKey(item);
    const group = map.get(key) || [];
    group.push(item);
    map.set(key, group);
  });

  return Array.from(map.entries()).sort((a, b) => {
    const aFirst = a[1][0];
    const bFirst = b[1][0];

    const titleMatchOrder = compareSearchTitleMatch(
      aFirst.title,
      bFirst.title,
      query,
      'includes'
    );
    if (titleMatchOrder !== 0) return titleMatchOrder;

    const yearOrder = compareYearDesc(aFirst.year, bFirst.year);
    if (yearOrder !== 0) return yearOrder;

    return a[0].localeCompare(b[0]);
  });
}
