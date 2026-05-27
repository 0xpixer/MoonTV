import { normalizeSearchQuery } from './search-query';

describe('search query helpers', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeSearchQuery('  三体  ')).toBe('三体');
  });

  it('collapses repeated whitespace between words', () => {
    expect(normalizeSearchQuery('three   body\nproblem')).toBe(
      'three body problem'
    );
  });
});
