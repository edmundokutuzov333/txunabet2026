import { describe, expect, it } from 'node:test';
import {
  MODULE_MAX_KEYS,
  MODULE_MAX_STRING,
  sanitizeModulePayload,
} from '../../src/lib/quality/module-security';

describe('migrated module payload security', () => {
  it('rejects non-object payloads', () => {
    expect(() => sanitizeModulePayload(null)).toThrow('INVALID_PAYLOAD');
    expect(() => sanitizeModulePayload([])).toThrow('INVALID_PAYLOAD');
  });

  it('removes server-controlled fields', () => {
    const result = sanitizeModulePayload({
      id: 'attacker-id',
      companyId: 'attacker-company',
      ownerId: 'attacker-owner',
      createdBy: 'attacker-user',
      title: 'Legitimate title',
    });
    expect(result).toEqual({ title: 'Legitimate title' });
  });

  it('keeps supported primitives and arrays', () => {
    expect(sanitizeModulePayload({ title: ' Hello ', count: 4, active: true, tags: [' a ', 'b'] })).toEqual({
      title: 'Hello',
      count: 4,
      active: true,
      tags: ['a', 'b'],
    });
  });

  it('bounds strings and number of keys', () => {
    const long = 'x'.repeat(MODULE_MAX_STRING + 100);
    const oversized = Object.fromEntries(Array.from({ length: MODULE_MAX_KEYS + 10 }, (_, index) => [`k${index}`, index]));
    const result = sanitizeModulePayload({ long, ...oversized });
    expect(String(result.long ?? '').length).toBeLessThanOrEqual(MODULE_MAX_STRING);
    expect(Object.keys(result).length).toBeLessThanOrEqual(MODULE_MAX_KEYS);
  });

  it('drops unsupported object values instead of persisting arbitrary data', () => {
    const result = sanitizeModulePayload({ title: 'ok', nested: { secret: 'value' }, fn: () => 'nope' });
    expect(result).toEqual({ title: 'ok' });
  });
});
