export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}
