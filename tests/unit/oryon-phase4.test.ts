import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('Oryon visual system defines dark and light themes', () => {
  const css = read('src/app/globals.css');
  assert.match(css, /\.dark\s*\{/);
  assert.match(css, /--surface-0:\s*250 24% 7%/);
  assert.match(css, /:root\s*\{/);
  assert.match(css, /--surface-0:\s*0 0% 98%/);
  assert.match(css, /color-scheme:\s*light/);
  assert.match(css, /html\.dark\s*\{\s*color-scheme:\s*dark/);
});

test('Oryon global interaction baseline covers focus, reduced motion and offline state', () => {
  const css = read('src/app/globals.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.oryon-offline/);
  assert.match(css, /disabled/);
});

test('Advanced Oryon primitives expose core accessibility semantics', () => {
  const system = read('src/components/oryon-ui/oryon-system.tsx');
  assert.match(system, /aria-label/);
  assert.match(system, /aria-checked/);
  assert.match(system, /focus-visible/);
  assert.match(system, /useReducedMotion/);
});

test('Phase 4 visual regression suite covers the complete acceptance surface', () => {
  const spec = read('tests/e2e/oryon-phase4-visual.spec.ts');
  for (const route of [
    '/login', '/dashboard', '/dashboard/inbox', '/dashboard/search', '/dashboard/tasks',
    '/dashboard/projects', '/dashboard/chat/general', '/dashboard/documents', '/dashboard/cloud',
    '/dashboard/forms', '/dashboard/workflows', '/dashboard/oryon-ai', '/dashboard/analytics',
    '/dashboard/pulse', '/dashboard/admin/enterprise', '/dashboard/settings',
  ]) assert.ok(spec.includes(route), `visual matrix missing ${route}`);
  for (const width of [1440, 1280, 1024, 390, 430]) assert.ok(spec.includes(String(width)), `viewport ${width} missing`);
  assert.ok(spec.includes("'dark'"));
  assert.ok(spec.includes("'light'"));
});

test('Phase 4 gate maps journeys to observability and recovery', () => {
  const doc = read('docs/ORYON-PHASE4-QA.md');
  for (const token of ['User', 'Interface', 'Action', 'Backend', 'Event', 'Notification', 'Automation', 'Analytics', 'AI', 'Audit']) {
    assert.ok(doc.includes(token), `service blueprint missing ${token}`);
  }
  for (const token of ['discover', 'understand', 'act', 'confirm', 'recover', 'continue']) {
    assert.ok(doc.includes(token), `UX journey state missing ${token}`);
  }
});
