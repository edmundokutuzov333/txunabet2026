import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity, requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';
import { writeAuditEvent } from '@/server/repositories/audit';
import { publishDomainEvent } from '@/server/services/foundation';

export type MeetingIntelligence = {
  summary: string;
  decisions: string[];
  actionItems: Array<{ title: string; ownerId?: string; dueDate?: string; source?: string }>;
  risks: string[];
  topics: string[];
};

function cleanText(value: unknown, limit = 30000): string { return typeof value === 'string' ? value.trim().slice(0, limit) : ''; }

async function gemini(prompt: string): Promise<MeetingIntelligence> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  const model = process.env.GEMINI_MEETING_MODEL ?? 'gemini-3.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4000 },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GEMINI_MEETING_${response.status}`);
  const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '{}';
  try {
    const parsed = JSON.parse(raw) as Partial<MeetingIntelligence>;
    return { summary: cleanText(parsed.summary, 10000), decisions: Array.isArray(parsed.decisions) ? parsed.decisions.map((item) => cleanText(item, 500)).filter(Boolean).slice(0, 50) : [], actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map((item) => ({ title: cleanText((item as Record<string, unknown>).title, 500), ownerId: typeof (item as Record<string, unknown>).ownerId === 'string' ? (item as Record<string, unknown>).ownerId : undefined, dueDate: typeof (item as Record<string, unknown>).dueDate === 'string' ? (item as Record<string, unknown>).dueDate : undefined, source: typeof (item as Record<string, unknown>).source === 'string' ? (item as Record<string, unknown>).source : undefined })).filter((item) => item.title).slice(0, 50) : [], risks: Array.isArray(parsed.risks) ? parsed.risks.map((item) => cleanText(item, 500)).filter(Boolean).slice(0, 50) : [], topics: Array.isArray(parsed.topics) ? parsed.topics.map((item) => cleanText(item, 300)).filter(Boolean).slice(0, 50) : [] };
  } catch { throw new Error('GEMINI_MEETING_INVALID_JSON'); }
}

async function getMeeting(id: string) {
  const identity = await requirePermission(PERMISSIONS.OPERATIONS_READ);
  const snap = await getAdminDb().collection('module_meetings').doc(id).get();
  if (!snap.exists || snap.data()?.companyId !== identity.companyId) throw new Error('NOT_FOUND');
  return { identity, snap };
}

export async function updateMeetingIntelligence(id: string, input: { agenda?: string; transcript?: string; notes?: string; recordingUrl?: string; videoUrl?: string; audioUrl?: string; captionsUrl?: string; attendance?: Array<Record<string, unknown>>; polls?: Array<Record<string, unknown>>; questions?: Array<Record<string, unknown>>; breakoutRooms?: Array<Record<string, unknown>> }) {
  const { identity, snap } = await getMeeting(id);
  await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
  const patch = { ...input, updatedAt: Timestamp.now(), updatedBy: identity.uid, intelligenceVersion: Number(snap.data()?.intelligenceVersion ?? 0) + 1 };
  await snap.ref.update(patch);
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'meeting.intelligence.update', resourceType: 'meeting', resourceId: id });
  return getMeeting(id).then(({ snap: next }) => ({ id: next.id, ...(next.data() ?? {}) }) as Record<string, unknown>);
}

export async function analyzeMeeting(id: string): Promise<MeetingIntelligence> {
  const { identity, snap } = await getMeeting(id);
  const data = snap.data() ?? {};
  const transcript = cleanText(data.transcript, 50000);
  const notes = cleanText(data.notes, 12000);
  const agenda = cleanText(data.agenda, 8000);
  if (!transcript && !notes) throw new Error('MEETING_TRANSCRIPT_REQUIRED');
  const prompt = `You are the meeting intelligence engine for Oryon. Analyze only the supplied meeting context. Return strict JSON with keys summary, decisions, actionItems, risks, topics. actionItems must be an array of objects with title, ownerId, dueDate, source. Do not invent people IDs or dates.\n\nMEETING TITLE: ${cleanText(data.title, 500)}\nAGENDA:\n${agenda}\n\nNOTES:\n${notes}\n\nTRANSCRIPT:\n${transcript}`;
  const result = await gemini(prompt);
  await snap.ref.update({ aiSummary: result.summary, decisions: result.decisions, actionItems: result.actionItems, risks: result.risks, topics: result.topics, intelligenceUpdatedAt: Timestamp.now(), updatedAt: Timestamp.now(), updatedBy: identity.uid });
  await publishDomainEvent({ eventName: 'meeting.intelligence.updated', entityType: 'meeting', entityId: id, payload: { title: String(data.title ?? ''), actionItems: result.actionItems.length, decisions: result.decisions.length }, metadata: { source: 'meeting-intelligence' } }, { companyId: identity.companyId, actorId: identity.uid });
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'meeting.ai.analyze', resourceType: 'meeting', resourceId: id, metadata: { actionItems: result.actionItems.length, decisions: result.decisions.length } });
  return result;
}

export async function createMeetingActions(id: string): Promise<{ tasks: string[]; approvals: string[] }> {
  const { identity, snap } = await getMeeting(id);
  await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
  const data = snap.data() ?? {};
  const actionItems = Array.isArray(data.actionItems) ? data.actionItems : [];
  const tasks: string[] = [];
  for (const item of actionItems.slice(0, 50)) {
    const value = item as Record<string, unknown>;
    const title = cleanText(value.title, 500); if (!title) continue;
    const ref = getAdminDb().collection('module_tasks').doc();
    await ref.create({ id: ref.id, companyId: identity.companyId, title, description: `Action item extraído da reunião ${String(data.title ?? id)}.`, status: 'todo', priority: 'medium', assigneeId: typeof value.ownerId === 'string' ? value.ownerId : undefined, dueDate: typeof value.dueDate === 'string' ? value.dueDate : undefined, meetingId: id, createdBy: identity.uid, updatedBy: identity.uid, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), version: 1, source: 'meeting-intelligence' });
    tasks.push(ref.id);
  }
  const approvals: string[] = [];
  const decisions = Array.isArray(data.decisions) ? data.decisions : [];
  for (const decision of decisions.slice(0, 20)) {
    const text = cleanText(decision, 1000); if (!text) continue;
    const ref = getAdminDb().collection('approvals').doc();
    await ref.create({ id: ref.id, companyId: identity.companyId, title: `Validação: ${String(data.title ?? 'Reunião')}`, description: text, requesterId: identity.uid, createdBy: identity.uid, updatedBy: identity.uid, state: 'PENDING', status: 'pending', mode: 'single', steps: [], currentStep: 0, entityType: 'meeting', entityId: id, metadata: { source: 'meeting-intelligence', decision: text }, version: 1, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    approvals.push(ref.id);
  }
  await writeAuditEvent({ companyId: identity.companyId, actorId: identity.uid, action: 'meeting.actions.create', resourceType: 'meeting', resourceId: id, metadata: { tasks: tasks.length, approvals: approvals.length } });
  return { tasks, approvals };
}

export async function ingestMeetingTranscript(id: string, transcript: string, source = 'manual') {
  const { identity, snap } = await getMeeting(id);
  await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);
  const cleaned = cleanText(transcript, 100000);
  if (!cleaned) throw new Error('TRANSCRIPT_REQUIRED');
  await snap.ref.update({ transcript: cleaned, transcriptSource: source, transcriptUpdatedAt: Timestamp.now(), updatedAt: Timestamp.now(), updatedBy: identity.uid });
  return analyzeMeeting(id);
}
