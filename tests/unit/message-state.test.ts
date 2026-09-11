import { describe, expect, test } from 'node:test';
import { mergeMessageState } from '../../src/lib/quality/message-state';

describe('message reconciliation', () => {
  test('deduplicates optimistic acknowledgement by clientMessageId', () => {
    const result = mergeMessageState(
      [{ id: 'optimistic-c1', clientMessageId: 'c1', createdAt: '2026-01-01T10:00:00.000Z' }],
      [{ id: 'server-1', clientMessageId: 'c1', createdAt: '2026-01-01T10:00:01.000Z' }],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('server-1');
  });

  test('keeps concurrent messages in timestamp order', () => {
    const result = mergeMessageState(
      [{ id: 'b', createdAt: '2026-01-01T10:00:02.000Z' }],
      [{ id: 'a', createdAt: '2026-01-01T10:00:01.000Z' }],
      [{ id: 'c', createdAt: '2026-01-01T10:00:03.000Z' }],
    );
    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  test('retains unique historical pages while realtime snapshots repeat records', () => {
    const result = mergeMessageState(
      [{ id: 'old-1', createdAt: '2026-01-01T09:00:00.000Z' }],
      [{ id: 'old-1', createdAt: '2026-01-01T09:00:00.000Z' }, { id: 'new-1', createdAt: '2026-01-01T10:00:00.000Z' }],
    );
    expect(result.map((item) => item.id)).toEqual(['old-1', 'new-1']);
  });
});
