import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const shellPath = path.join(root, 'src/components/layout/oryon-shell-v2.tsx');
const layoutPath = path.join(root, 'src/app/dashboard/layout.tsx');

async function source(filePath: string) {
  return readFile(filePath, 'utf8');
}

test('Oryon shell has the required navigation sections', async () => {
  const content = await source(shellPath);
  for (const section of ['COMMAND', 'WORK', 'COLLABORATE', 'KNOWLEDGE', 'AUTOMATE', 'INTELLIGENCE', 'ENTERPRISE']) {
    assert.match(content, new RegExp(`title: ['\"]${section}['\"]`));
  }
});

test('Oryon shell keeps departments in a context layer', async () => {
  const content = await source(shellPath);
  assert.match(content, /DepartmentContext/);
  assert.match(content, /Department context/);
});

test('Command menu exposes keyboard shortcut and core actions', async () => {
  const content = await source(shellPath);
  assert.match(content, /metaKey \|\| event\.ctrlKey/);
  assert.match(content, /event\.key\.toLowerCase\(\) === ['\"]k['\"]/);
  for (const action of ['Create task', 'Create project', 'Start meeting', 'Open AI', 'Create workflow']) {
    assert.match(content, new RegExp(action));
  }
});

test('Responsive shell exposes mobile navigation and safe bottom spacing', async () => {
  const [shell, layout] = await Promise.all([source(shellPath), source(layoutPath)]);
  assert.match(shell, /export function MobileBottomNav/);
  assert.match(shell, /aria-label=['\"]Navegação móvel['\"]/);
  assert.match(layout, /pb-14 md:pb-0/);
  assert.match(layout, /h-\[100dvh\]/);
});

test('Shell consumes the enterprise identity for navigation permissions', async () => {
  const content = await source(shellPath);
  assert.match(content, /useEnterpriseIdentity/);
  assert.match(content, /identity\.permissions\.includes\(permission\)/);
});
