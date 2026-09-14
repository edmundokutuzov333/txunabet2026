import 'server-only';

import { calculateProjectHealth, type ProjectHealth } from './project-os';

export type ProjectHealthMetrics = Parameters<typeof calculateProjectHealth>[0];

export function evaluateProjectHealth(metrics: ProjectHealthMetrics): { health: ProjectHealth; score: number; reasons: string[] } {
  return calculateProjectHealth(metrics);
}
