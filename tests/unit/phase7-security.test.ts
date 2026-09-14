import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeOutboundUrl, safeFileName, signWebhook, verifyWebhookSignature } from '../../src/server/services/security-hardening';

test('phase7 security blocks private outbound targets', () => {
  assert.throws(() => assertSafeOutboundUrl('http://127.0.0.1:8080/test'), /HTTPS_REQUIRED/);
  assert.throws(() => assertSafeOutboundUrl('https://169.254.169.254/latest/meta-data'), /SSRF_BLOCKED/);
  assert.throws(() => assertSafeOutboundUrl('https://10.0.0.8/internal'), /SSRF_BLOCKED/);
  assert.equal(assertSafeOutboundUrl('https://example.com/hook').hostname, 'example.com');
});

test('phase7 webhook signatures are time-bound and constant-time checked', () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const body = '{"event":"test"}';
  const signature = signWebhook('secret', ts, body);
  assert.equal(verifyWebhookSignature('secret', ts, body, signature), true);
  assert.equal(verifyWebhookSignature('wrong', ts, body, signature), false);
  assert.equal(verifyWebhookSignature('secret', String(Number(ts) - 1000), body, signature), false);
});

test('phase7 file names are normalized', () => {
  assert.equal(safeFileName('../../unsafe name?.png'), '.._.._unsafe_name_.png');
  assert.throws(() => safeFileName(''), /INVALID_FILENAME/);
});
