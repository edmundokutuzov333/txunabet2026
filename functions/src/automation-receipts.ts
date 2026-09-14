import * as admin from 'firebase-admin';

export type StepReceiptResult = {
  status: 'completed';
  result: Record<string, unknown>;
  mutationKey: string;
};

function db() { return admin.firestore(); }

export function stepReceiptId(jobId: string, executionId: string, stepId: string): string {
  return `${jobId}:${executionId}:${stepId}`.replace(/[^A-Za-z0-9:_-]/g, '_').slice(0, 700);
}

export async function getStepReceipt(jobId: string, executionId: string, stepId: string): Promise<StepReceiptResult | null> {
  const snapshot = await db().collection('automation_step_receipts').doc(stepReceiptId(jobId, executionId, stepId)).get();
  if (!snapshot.exists || snapshot.data()?.status !== 'completed') return null;
  return {
    status: 'completed',
    result: (snapshot.data()?.result && typeof snapshot.data()?.result === 'object') ? snapshot.data()?.result as Record<string, unknown> : {},
    mutationKey: String(snapshot.data()?.mutationKey ?? ''),
  };
}

export async function writeStepReceipt(input: { companyId: string; jobId: string; executionId: string; stepId: string; mutationKey: string; result?: Record<string, unknown> }): Promise<void> {
  const ref = db().collection('automation_step_receipts').doc(stepReceiptId(input.jobId, input.executionId, input.stepId));
  await ref.set({ companyId: input.companyId, jobId: input.jobId, executionId: input.executionId, stepId: input.stepId, mutationKey: input.mutationKey, status: 'completed', result: input.result ?? {}, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: false });
}
