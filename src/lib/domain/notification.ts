export type NotificationType =
  | 'new_message'
  | 'mention'
  | 'reply'
  | 'document_shared'
  | 'document_comment'
  | 'task_assigned'
  | 'meeting_invite';

export interface NotificationRecord {
  id: string;
  userId: string;
  companyId: string;
  type: NotificationType;
  conversationId?: string | null;
  messageId?: string | null;
  actorId?: string | null;
  bodyPreview: string;
  read: boolean;
  createdAt: unknown;
  readAt?: unknown | null;
}
