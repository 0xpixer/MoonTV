export interface VideoTestResult {
  quality: string;
  loadSpeed: string;
  pingTime: number;
}

interface RankingContext {
  maxSpeedKbps: number;
  minPingMs: number;
  maxPingMs: number;
}

const QUALITY_SCORES: Record<string, number> = {
  '4K': 100,
  '2K': 85,
  '1080p': 75,
  '720p': 60,
  '480p': 40,
  SD: 20,
};

export function parseLoadSpeedKbps(loadSpeed: string): number {
  if (loadSpeed === '未知' || loadSpeed === '测量中...') return 0;

  const match = loadSpeed.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2];
  return unit === 'MB/s' ? value * 1024 : value;
}

export function getRankingContext(
  results: Array<{ testResult: VideoTestResult }>
): RankingContext {
  const validSpeeds = results
    .map((result) => parseLoadSpeedKbps(result.testResult.loadSpeed))
    .filter((speed) => speed > 0);

  const validPings = results
    .map((result) => result.testResult.pingTime)
    .filter((ping) => ping > 0);

  return {
    maxSpeedKbps: validSpeeds.length > 0 ? Math.max(...validSpeeds) : 1024,
    minPingMs: validPings.length > 0 ? Math.min(...validPings) : 50,
    maxPingMs: validPings.length > 0 ? Math.max(...validPings) : 1000,
  };
}

export function calculateSourceScore(
  testResult: VideoTestResult,
  context: RankingContext
): number {
  const qualityScore = QUALITY_SCORES[testResult.quality] ?? 0;

  const speedKbps = parseLoadSpeedKbps(testResult.loadSpeed);
  const speedScore =
    speedKbps > 0
      ? Math.min(100, Math.max(0, (speedKbps / context.maxSpeedKbps) * 100))
      : 30;

  const pingScore = (() => {
    const ping = testResult.pingTime;
    if (ping <= 0) return 0;
    if (context.maxPingMs === context.minPingMs) return 100;
    return Math.min(
      100,
      Math.max(
        0,
        ((context.maxPingMs - ping) / (context.maxPingMs - context.minPingMs)) *
          100
      )
    );
  })();

  return (
    Math.round(
      (qualityScore * 0.4 + speedScore * 0.4 + pingScore * 0.2) * 100
    ) / 100
  );
}

export function rankSourceTestResults<
  T extends { testResult: VideoTestResult }
>(results: T[]): Array<T & { score: number }> {
  const context = getRankingContext(results);

  return results
    .map((result) => ({
      ...result,
      score: calculateSourceScore(result.testResult, context),
    }))
    .sort((a, b) => b.score - a.score);
}
