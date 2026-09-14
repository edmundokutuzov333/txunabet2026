import {
  calculateCapacity,
  calculateGoalProgress,
  calculateProjectHealth,
  type ProjectHealth,
  type ProjectHealthMetrics,
} from './project-health-core';

export { calculateCapacity, calculateGoalProgress, calculateProjectHealth } from './project-health-core';
export type { ProjectHealth, ProjectHealthMetrics } from './project-health-core';

export function evaluateProjectHealth(metrics: ProjectHealthMetrics): { health: ProjectHealth; score: number; reasons: string[] } {
  return calculateProjectHealth(metrics);
}
