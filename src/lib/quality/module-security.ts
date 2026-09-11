export const MODULE_SAFE_KEY = /^[A-Za-z0-9_-]{1,180}$/;
export const MODULE_MAX_KEYS = 60;
export const MODULE_MAX_STRING = 5000;
export const MODULE_SERVER_FIELDS = new Set([
  'id', 'companyId', 'ownerId', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt', 'version', 'searchTitle',
]);

function normalizePrimitive(value: unknown): unknown {
  if (typeof value === 'string') return value.trim().slice(0, MODULE_MAX_STRING);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value;
  if (value === null) return null;
  if (Array.isArray(value)) return value.slice(0, 200).map(normalizePrimitive);
  return undefined;
}

export function sanitizeModulePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('INVALID_PAYLOAD');
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>).slice(0, MODULE_MAX_KEYS)) {
    if (!MODULE_SAFE_KEY.test(key) || MODULE_SERVER_FIELDS.has(key)) continue;
    const normalized = normalizePrimitive(value);
    if (normalized !== undefined) result[key] = normalized;
  }
  return result;
}
