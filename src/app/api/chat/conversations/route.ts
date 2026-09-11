import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/server/firebase/admin';
import { getOrCreateConversation, requireChatIdentity, type ConversationKind } from '@/server/services/chat';

const createSchema = z.object({
  type: z.enum(['company_general', 'department', 'direct', 'group']),
  departmentId: z.string().min(1).max(128).optional(),
  targetUserId: z.string().min(1).max(128).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  memberIds: z.array(z.string().min(1).max(128)).max(100).optional(),
});

export async function GET() {
  try {
    const identity = await requireChatIdentity();
    const db = getAdminDb();
    const snapshots = await db.collection('conversations').where('companyId', '==', identity.companyId).orderBy('updatedAt', 'desc').limit(100).get();
    const conversations = snapshots.docs
      .map((doc) => doc.data())
      .filter((conversation) => {
        if (conversation.type === 'company_general') return true;
        if (conversation.type === 'department') return identity.departmentIds.includes(conversation.departmentId);
        return Array.isArray(conversation.memberIds) && conversation.memberIds.includes(identity.uid);
      });
    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ conversations: [] }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());
    const conversation = await getOrCreateConversation(payload as { type: ConversationKind; departmentId?: string; targetUserId?: string; name?: string; memberIds?: string[] });
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVALID_REQUEST';
    const status = message === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
