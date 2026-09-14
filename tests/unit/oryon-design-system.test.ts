import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
const tailwind = readFileSync(join(root, 'tailwind.config.ts'), 'utf8');
const system = readFileSync(join(root, 'src/components/oryon-ui/oryon-system.tsx'), 'utf8');

 test('Oryon DS defines the canonical surface and accent tokens', () => {
  assert.match(css, /--surface-0:\s*250 24% 7%/);
  assert.match(css, /--surface-1:\s*252 22% 10%/);
  assert.match(css, /--surface-2:\s*252 21% 13%/);
  assert.match(css, /--surface-3:\s*253 22% 16%/);
  assert.match(css, /--primary:\s*90 85% 55%/);
});

 test('Oryon DS uses the prescribed radius and elevation ladder', () => {
  assert.match(css, /--radius-control:\s*6px/);
  assert.match(css, /--radius-input:\s*8px/);
  assert.match(css, /--radius-card:\s*10px/);
  assert.match(css, /--radius-panel:\s*12px/);
  assert.match(css, /--radius-dialog:\s*14px/);
  assert.match(tailwind, /control:\s*'6px'/);
  assert.match(tailwind, /input:\s*'8px'/);
  assert.match(tailwind, /card:\s*'10px'/);
  assert.match(tailwind, /panel:\s*'12px'/);
  assert.match(tailwind, /dialog:\s*'14px'/);
  assert.match(tailwind, /raised:\s*'var\(--elevation-raised\)'/);
  assert.match(tailwind, /floating:\s*'var\(--elevation-floating\)'/);
  assert.match(tailwind, /overlay:\s*'var\(--elevation-overlay\)'/);
  assert.match(tailwind, /modal:\s*'var\(--elevation-modal\)'/);
});

 test('Oryon DS removes ornamental bounce motion', () => {
  assert.doesNotMatch(css, /@keyframes bounceIn/);
  assert.doesNotMatch(tailwind, /bounce-in/);
});

 test('Oryon UI exposes the phase-one catalogue', () => {
  const catalogue = [
    'OryonButton','OryonIconButton','OryonInput','OryonSelect','OryonSwitch','OryonBadge','OryonStatus',
    'OryonCard','OryonPanel','OryonDialog','OryonSheet','OryonPopover','OryonCommand','OryonTabs',
    'OryonTable','OryonDataGrid','OryonTimeline','OryonActivity','OryonEntityHeader','OryonInspector',
    'OryonEmptyState','OryonSkeleton','OryonToast','OryonNotificationPanel','OryonPinnedList',
    'OryonAIResponse','OryonRiskCard','GradientWaveText','SlideUpText','ShimmerText','BorderBeam',
  ];
  for (const name of catalogue) assert.match(system, new RegExp(`(?:export (?:const|function)|export const ${name}|${name})`));
});
