import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCapacity, calculateGoalProgress, calculateProjectHealth } from '../../src/server/services/project-health-core';

test('goal progress is bounded to 0..100', () => {
  assert.equal(calculateGoalProgress(50, 100), 50);
  assert.equal(calculateGoalProgress(150, 100), 100);
  assert.equal(calculateGoalProgress(-10, 100), 0);
  assert.equal(calculateGoalProgress(10, 0), 0);
});

test('capacity calculates utilization and overload accurately', () => {
  assert.deepEqual(calculateCapacity(40, 32), { availableHours: 40, allocatedHours: 32, utilization: 80, overloadHours: 0, underloadHours: 8 });
  assert.equal(calculateCapacity(40, 50).utilization, 125);
  assert.equal(calculateCapacity(40, 50).overloadHours, 10);
});

test('project health becomes at risk under material schedule pressure', () => {
  const result = calculateProjectHealth({ overdueTasks: 2, blockedTasks: 0, criticalTasks: 0, capacityUtilization: 100, milestoneVarianceDays: 0, deadlineDays: 4, recentActivityDays: 2, budgetPercent: 70, unresolvedRisks: 2 });
  assert.equal(result.health, 'AT_RISK');
  assert.equal(result.score, 78);
  assert.ok(result.reasons.length >= 2);
});

test('project health becomes critical under severe risk', () => {
  const result = calculateProjectHealth({ overdueTasks: 5, blockedTasks: 3, criticalTasks: 3, capacityUtilization: 130, milestoneVarianceDays: 8, deadlineDays: 1, recentActivityDays: 14, budgetPercent: 125, unresolvedRisks: 5 });
  assert.equal(result.health, 'CRITICAL');
  assert.ok(result.score < 55);
});
