import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireIdentity } from '@/server/authorization';
import { answerKnowledgeQuestion, analyzeBusinessQuestion, analyzeMeeting, buildOperationsRisk, buildWorkflowFromPrompt, buildWeeklyReport, executiveBriefing, getAIControlPlane, manageProject, predictiveOperations } from '@/server/services/intelligent-operations';

export const runtime = 'nodejs';

const schema = z.object({
  agent: z.enum(['executive','analyst','project-manager','meeting','knowledge','workflow-builder','report-builder','risk','predictive','control-plane']),
  prompt: z.string().trim().max(12000).optional(),
  entityId: z.string().trim().max(180).optional(),
  execute: z.boolean().default(false),
  days: z.number().int().min(1).max(7).optional(),
  horizonDays: z.number().int().min(1).max(30).optional(),
});

function statusFor(error: unknown): number {
  const message = error instanceof Error ? error.message : '';
  if (message === 'UNAUTHENTICATED') return 401;
  if (message === 'FORBIDDEN' || message === 'SENSITIVE_TOOL_REQUIRES_ADMIN') return 403;
  if (message === 'AI_RATE_LIMITED') return 429;
  if (message.includes('TIMEOUT') || message.includes('REQUEST_FAILED')) return 502;
  return 400;
}

export async function GET() {
  try { return NextResponse.json(await getAIControlPlane(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'AI_CONTROL_PLANE_FAILED' }, { status: statusFor(error) }); }
}

export async function POST(request: NextRequest) {
  try {
    await requireIdentity();
    const input = schema.parse(await request.json());
    let result: unknown;
    switch (input.agent) {
      case 'executive': result = await executiveBriefing({ days: input.days, execute: input.execute }); break;
      case 'analyst': if (!input.prompt) throw new Error('PROMPT_REQUIRED'); result = await analyzeBusinessQuestion(input.prompt, { execute: input.execute }); break;
      case 'project-manager': if (!input.entityId) throw new Error('ENTITY_ID_REQUIRED'); result = await manageProject(input.entityId, { execute: input.execute }); break;
      case 'meeting': if (!input.entityId) throw new Error('ENTITY_ID_REQUIRED'); result = await analyzeMeeting(input.entityId, input.prompt); break;
      case 'knowledge': if (!input.prompt) throw new Error('PROMPT_REQUIRED'); result = await answerKnowledgeQuestion(input.prompt); break;
      case 'workflow-builder': if (!input.prompt) throw new Error('PROMPT_REQUIRED'); result = await buildWorkflowFromPrompt(input.prompt, { execute: input.execute }); break;
      case 'report-builder': result = await buildWeeklyReport(input.prompt ?? 'Marketing', { execute: input.execute }); break;
      case 'risk': result = await buildOperationsRisk({ horizonDays: input.horizonDays }); break;
      case 'predictive': result = await predictiveOperations({ horizonDays: input.horizonDays }); break;
      case 'control-plane': result = await getAIControlPlane(); break;
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI_AGENT_FAILED' }, { status: statusFor(error) });
  }
}
