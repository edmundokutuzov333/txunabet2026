export type ConversationType = 'company_general' | 'department' | 'direct' | 'group';

export interface ConversationRecord {
  id: string;
  companyId: string;
  type: ConversationType;
  departmentId?: string | null;
  name?: string | null;
  memberIds: string[];
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
  lastMessageAt?: unknown;
  lastMessageId?: string | null;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type: 'text' | 'system' | 'file';
  createdAt: unknown;
  updatedAt?: unknown;
  editedAt?: unknown | null;
  deletedAt?: unknown | null;
  replyToMessageId?: string | null;
  clientMessageId?: string | null;
}
