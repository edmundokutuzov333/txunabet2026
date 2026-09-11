import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity } from '@/server/authorization';

const schema = z.object({
  q: z.string().trim().min(2).max(100),
  conversationId: z.string().max(128).optional(),
  senderId: z.string().max(128).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_@-]+/g, ' ').trim();
}

export async function GET(request: Request) {
  try {
    const identity = await requireIdentity();
    const url = new URL(request.url);
    const input = schema.parse(Object.fromEntries(url.searchParams.entries()));
    const term = normalize(input.q).split(/\s+/)[0];
    const snapshot = await getAdminDb().collectionGroup('messages')
      .where('companyId', '==', identity.companyId)
      .where('searchTokens', 'array-contains', term)
      .limit(100)
      .get();

    const results = snapshot.docs.map((doc) => doc.data()).filter((message) => {
      if (input.conversationId && message.conversationId !== input.conversationId) return false;
      if (input.senderId && message.senderId !== input.senderId) return false;
      const createdAt = message.createdAt?.toDate?.() ?? new Date(message.createdAt ?? 0);
      if (input.from && createdAt < input.from) return false;
      if (input.to && createdAt > input.to) return false;
      return normalize(String(message.body ?? '')).includes(normalize(input.q));
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ results: [], error: error instanceof Error ? error.message : 'INVALID_REQUEST' }, { status: 400 });
  }
}
