import { cronMatches } from './automation-engine';

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

  test('invalid cron never matches', () => {
    const date = new Date('2026-09-11T07:00:00.000Z');
    expect(cronMatches('not-a-cron', date, 'Africa/Maputo')).toBe(false);
  });
});
