import {
  calculateSourceScore,
  getRankingContext,
  parseLoadSpeedKbps,
  rankSourceTestResults,
} from './source-ranking';

describe('source ranking', () => {
  it('parses load speeds into KB/s', () => {
    expect(parseLoadSpeedKbps('512 KB/s')).toBe(512);
    expect(parseLoadSpeedKbps('1.5 MB/s')).toBe(1536);
    expect(parseLoadSpeedKbps('未知')).toBe(0);
    expect(parseLoadSpeedKbps('not a speed')).toBe(0);
  });

  it('scores quality, speed, and ping together', () => {
    const results = [
      { testResult: { quality: '1080p', loadSpeed: '1 MB/s', pingTime: 50 } },
      { testResult: { quality: '720p', loadSpeed: '512 KB/s', pingTime: 200 } },
    ];
    const context = getRankingContext(results);

    expect(
      calculateSourceScore(results[0].testResult, context)
    ).toBeGreaterThan(calculateSourceScore(results[1].testResult, context));
  });

  it('ranks the best playback source first', () => {
    const ranked = rankSourceTestResults([
      {
        sourceName: 'slow 4k',
        testResult: { quality: '4K', loadSpeed: '256 KB/s', pingTime: 500 },
      },
      {
        sourceName: 'balanced 1080p',
        testResult: { quality: '1080p', loadSpeed: '2 MB/s', pingTime: 60 },
      },
      {
        sourceName: 'fast unknown',
        testResult: { quality: '未知', loadSpeed: '3 MB/s', pingTime: 20 },
      },
    ]);

    expect(ranked[0].sourceName).toBe('balanced 1080p');
    expect(ranked.map((item) => item.score)).toEqual(
      [...ranked.map((item) => item.score)].sort((a, b) => b - a)
    );
  });
});
