import { cronMatches, retryDelayMs } from './automation-engine';

describe('automation cron engine', () => {
  test('matches exact minute and hour in timezone', () => {
    const date = new Date('2026-09-11T07:00:00.000Z');
    expect(cronMatches('0 9 * * 5', date, 'Africa/Maputo')).toBe(true);
  });

  test('rejects wrong minute', () => {
    const date = new Date('2026-09-11T07:01:00.000Z');
    expect(cronMatches('0 9 * * 5', date, 'Africa/Maputo')).toBe(false);
  });

  test('supports intervals', () => {
    const date = new Date('2026-09-11T07:15:00.000Z');
    expect(cronMatches('*/15 9 * * 5', date, 'Africa/Maputo')).toBe(true);
  });

  test('uses standard cron OR semantics for restricted day-of-month and day-of-week', () => {
    const friday = new Date('2026-09-11T07:00:00.000Z');
    const monday = new Date('2026-09-14T07:00:00.000Z');
    const fifteenth = new Date('2026-09-15T07:00:00.000Z');
    expect(cronMatches('0 9 15 * 5', friday, 'Africa/Maputo')).toBe(true);
    expect(cronMatches('0 9 15 * 5', monday, 'Africa/Maputo')).toBe(false);
    expect(cronMatches('0 9 15 * 5', fifteenth, 'Africa/Maputo')).toBe(true);
  });

  test('accepts Sunday as 0 and 7', () => {
    const sunday = new Date('2026-09-13T07:00:00.000Z');
    expect(cronMatches('0 9 * * 0', sunday, 'Africa/Maputo')).toBe(true);
    expect(cronMatches('0 9 * * 7', sunday, 'Africa/Maputo')).toBe(true);
  });

  test('invalid cron never matches', () => {
    const date = new Date('2026-09-11T07:00:00.000Z');
    expect(cronMatches('not-a-cron', date, 'Africa/Maputo')).toBe(false);
  });

  test('retry backoff is bounded and deterministic', () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(4)).toBe(240_000);
    expect(retryDelayMs(5)).toBe(480_000);
    expect(retryDelayMs(6)).toBe(15 * 60_000);
    expect(retryDelayMs(100)).toBe(15 * 60_000);
  });
});
