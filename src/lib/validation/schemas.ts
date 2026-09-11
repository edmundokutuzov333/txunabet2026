import { z } from 'zod';

export const companyIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const userIdSchema = z.string().min(1).max(128);
export const departmentIdSchema = z.string().min(1).max(128);

export const createMessageInputSchema = z.object({
  conversationId: z.string().min(1).max(128),
  body: z.string().trim().min(1).max(20_000),
  type: z.enum(['text', 'system', 'file']).default('text'),
  clientMessageId: z.string().uuid().optional(),
  replyToMessageId: z.string().min(1).max(128).nullable().optional(),
});

export const createConversationInputSchema = z.object({
  type: z.enum(['company_general', 'department', 'direct', 'group']),
  departmentId: departmentIdSchema.nullable().optional(),
  memberIds: z.array(userIdSchema).max(200).default([]),
  name: z.string().trim().min(1).max(160).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.type === 'department' && !value.departmentId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['departmentId'], message: 'Department conversations require a departmentId.' });
  }
  if (value.type === 'direct' && value.memberIds.length !== 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memberIds'], message: 'Direct conversations require exactly two members.' });
  }
});

export const updateMessageInputSchema = z.object({
  conversationId: z.string().min(1).max(128),
  messageId: z.string().min(1).max(128),
  body: z.string().trim().min(1).max(20_000),
});

export const createDocumentInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  companyId: companyIdSchema,
  content: z.string().max(1_000_000).default(''),
});

export const updateDocumentInputSchema = z.object({
  documentId: z.string().min(1).max(128),
  content: z.string().max(2_000_000),
  title: z.string().trim().min(1).max(200).optional(),
});

export const shareDocumentInputSchema = z.object({
  documentId: z.string().min(1).max(128),
  userId: userIdSchema,
  access: z.enum(['viewer', 'editor']),
});

export const aiRequestInputSchema = z.object({
  prompt: z.string().trim().min(1).max(20_000),
  conversationId: z.string().min(1).max(128).optional(),
  documentId: z.string().min(1).max(128).optional(),
  history: z.array(z.object({ role: z.enum(['user', 'model']), content: z.string().max(20_000) })).max(50).optional(),
});

export const companyMemberSchema = z.object({
  userId: userIdSchema,
  companyId: companyIdSchema,
  role: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']),
  permissions: z.array(z.string().min(1).max(120)).max(100).default([]),
  status: z.enum(['active', 'suspended', 'invited']).default('active'),
  departmentIds: z.array(departmentIdSchema).max(50).default([]),
});

export const userProfileSchema = z.object({
  uid: userIdSchema,
  email: z.string().email().max(320),
  displayName: z.string().trim().min(1).max(160),
  photoURL: z.string().url().max(2_000).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  status: z.enum(['active', 'suspended', 'pending', 'disabled']),
  mfaRequired: z.boolean().default(false),
});

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageInputSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentInputSchema>;
export type ShareDocumentInput = z.infer<typeof shareDocumentInputSchema>;
export type AIRequestInput = z.infer<typeof aiRequestInputSchema>;
