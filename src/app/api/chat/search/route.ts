import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity } from '@/server/authorization';

const schema = z.object({
  q: z.string().trim().min(2).max(100),
  conversationId: z.string().max(128).optional(),
  senderId: z.string().max(128).optional(),
  departmentId: z.string().max(128).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function normalize(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9@_-]+/g, ' ').trim(); }

export async function GET(request: Request) {
  try {
    const identity = await requireIdentity();
    const url = new URL(request.url);
    const input = schema.parse(Object.fromEntries(url.searchParams.entries()));
    const term = normalize(input.q).split(/\s+/)[0];
    const snapshot = await getAdminDb().collectionGroup('messages').where('companyId', '==', identity.companyId).where('searchTokens', 'array-contains', term).limit(100).get();
    const results = [];
    for (const doc of snapshot.docs) {
      const message = doc.data();
      if (input.conversationId && message.conversationId !== input.conversationId) continue;
      if (input.senderId && message.senderId !== input.senderId) continue;
      const createdAt = message.createdAt?.toDate?.() ?? new Date(message.createdAt ?? 0);
      if (input.from && createdAt < input.from) continue;
      if (input.to && createdAt > input.to) continue;
      if (input.departmentId) {
        const conversation = await getAdminDb().collection('conversations').doc(message.conversationId).get();
        if (!conversation.exists || conversation.data()?.departmentId !== input.departmentId) continue;
      }
      const normalizedBody = normalize(String(message.body ?? ''));
      const attachmentMatch = Array.isArray(message.attachments) && message.attachments.some((attachment: { name?: string }) => normalize(String(attachment.name ?? '')).includes(normalize(input.q)));
      if (!normalizedBody.includes(normalize(input.q)) && !attachmentMatch) continue;
      results.push(message);
    }
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ results: [], error: error instanceof Error ? error.message : 'INVALID_REQUEST' }, { status: 400 });
  }
}
