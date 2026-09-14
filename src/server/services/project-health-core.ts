export type ProjectHealth = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

export function calculateGoalProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
}

export function calculateCapacity(availableHours: number, allocatedHours: number) {
  const available = Math.max(0, availableHours);
  const allocated = Math.max(0, allocatedHours);
  const utilization = available > 0 ? (allocated / available) * 100 : allocated > 0 ? 100 : 0;
  return {
    availableHours: available,
    allocatedHours: allocated,
    utilization: Math.round(utilization * 10) / 10,
    overloadHours: Math.max(0, allocated - available),
    underloadHours: Math.max(0, available - allocated),
  };
}

export interface ProjectHealthMetrics {
  overdueTasks: number;
  blockedTasks: number;
  criticalTasks: number;
  capacityUtilization: number;
  milestoneVarianceDays: number;
  deadlineDays: number;
  recentActivityDays: number;
  budgetPercent: number;
  unresolvedRisks: number;
}

export function calculateProjectHealth(input: ProjectHealthMetrics) {
  const reasons: string[] = [];
  let score = 100;
  if (input.overdueTasks > 0) { score -= Math.min(30, input.overdueTasks * 6); reasons.push(`${input.overdueTasks} tarefas em atraso`); }
  if (input.blockedTasks > 0) { score -= Math.min(25, input.blockedTasks * 8); reasons.push(`${input.blockedTasks} tarefas bloqueadas`); }
  if (input.criticalTasks > 0) { score -= Math.min(25, input.criticalTasks * 10); reasons.push(`${input.criticalTasks} tarefas críticas`); }
  if (input.capacityUtilization > 100) { score -= Math.min(25, (input.capacityUtilization - 100) * 0.8); reasons.push(`capacidade a ${Math.round(input.capacityUtilization)}%`); }
  if (input.milestoneVarianceDays > 0) { score -= Math.min(20, input.milestoneVarianceDays * 2); reasons.push(`milestones ${input.milestoneVarianceDays} dias atrasados`); }
  if (input.deadlineDays >= 0 && input.deadlineDays <= 3) { score -= 10; reasons.push('deadline próximo'); }
  if (input.recentActivityDays > 7) { score -= 8; reasons.push('baixa atividade recente'); }
  if (input.budgetPercent > 100) { score -= Math.min(25, input.budgetPercent - 100); reasons.push(`budget ${Math.round(input.budgetPercent)}% consumido`); }
  if (input.unresolvedRisks > 0) { score -= Math.min(20, input.unresolvedRisks * 5); reasons.push(`${input.unresolvedRisks} riscos por resolver`); }
  const health: ProjectHealth = score < 55 || input.criticalTasks >= 3 || input.capacityUtilization >= 125 || input.budgetPercent >= 120
    ? 'CRITICAL'
    : score < 80 || input.overdueTasks >= 2 || input.capacityUtilization > 100 || input.unresolvedRisks >= 2
      ? 'AT_RISK'
      : 'HEALTHY';
  return { health, score: Math.round(Math.max(0, Math.min(100, score))), reasons };
}
