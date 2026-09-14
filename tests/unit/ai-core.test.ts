import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgentPlanSchema } from '@/server/services/ai-core';

test('AgentPlanSchema accepts a bounded tool plan', () => {
  const plan = AgentPlanSchema.parse({
    answer: 'Resumo operacional.',
    toolCalls: [{ tool: 'searchOryon', input: { q: 'marketing' }, reason: 'Recolher evidência.' }],
    confidence: 0.82,
    sources: ['tasks:123'],
  });
  assert.equal(plan.toolCalls[0]?.tool, 'searchOryon');
  assert.equal(plan.confidence, 0.82);
});

test('AgentPlanSchema rejects confidence outside the valid range', () => {
  assert.throws(() => AgentPlanSchema.parse({ answer: 'x', confidence: 1.5 }));
});

test('AgentPlanSchema defaults missing tool calls and sources', () => {
  const plan = AgentPlanSchema.parse({ answer: 'Sem alterações.' });
  assert.deepEqual(plan.toolCalls, []);
  assert.deepEqual(plan.sources, []);
});
