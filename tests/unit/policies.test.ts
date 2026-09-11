import { describe, expect, test } from 'node:test';
import {
  canAccessConversation,
  canDirectMessage,
  canShareWithDepartment,
  canShareWithUser,
  classifyNotification,
  extractMentionIds,
  hasChannelMention,
  nextDocumentVersion,
  normalizeSearchTokens,
  sanitizeAIInput,
  uniqueReactionUsers,
  validateAIContext,
} from '../../src/lib/quality/policies';

describe('enterprise policies', () => {
  const marketing = { uid: 'user-a', companyId: 'company-1', departmentIds: ['marketing'] };

  test('allows a company general conversation', () => {
    expect(canAccessConversation(marketing, { companyId: 'company-1', type: 'company_general' })).toBe(true);
  });

  test('allows same-department access and denies a different department', () => {
    expect(canAccessConversation(marketing, { companyId: 'company-1', type: 'department', departmentId: 'marketing' })).toBe(true);
    expect(canAccessConversation(marketing, { companyId: 'company-1', type: 'department', departmentId: 'finance' })).toBe(false);
  });

  test('direct conversations stay inside the company', () => {
    expect(canDirectMessage(marketing, { uid: 'user-b', companyId: 'company-1', active: true })).toBe(true);
    expect(canDirectMessage(marketing, { uid: 'user-b', companyId: 'company-2', active: true })).toBe(false);
    expect(canDirectMessage(marketing, { uid: 'user-a', companyId: 'company-1', active: true })).toBe(false);
  });

  test('document shares reject external or inactive users', () => {
    expect(canShareWithUser(marketing, { uid: 'user-b', companyId: 'company-1', active: true }, 'editor')).toBe(true);
    expect(canShareWithUser(marketing, { uid: 'user-c', companyId: 'company-2', active: true }, 'viewer')).toBe(false);
    expect(canShareWithUser(marketing, { uid: 'user-d', companyId: 'company-1', active: false }, 'viewer')).toBe(false);
  });

  test('department sharing is company-scoped', () => {
    expect(canShareWithDepartment(marketing, { companyId: 'company-1', departmentId: 'finance' })).toBe(true);
    expect(canShareWithDepartment(marketing, { companyId: 'company-2', departmentId: 'finance' })).toBe(false);
  });

  test('search tokenization is normalized and bounded', () => {
    expect(normalizeSearchTokens('Olá, MARKETING! risco risco campanha')).toEqual(['ola', 'marketing', 'risco', 'campanha']);
  });

  test('AI input is sanitized and bounded', () => {
    expect(sanitizeAIInput('  hello\u0000\nworld  ')).toBe('hello\nworld');
    expect(sanitizeAIInput('x'.repeat(50), 12)).toHaveLength(12);
  });

  test('AI context cannot cross companies', () => {
    expect(validateAIContext({ companyId: 'company-1', sourceCompanyId: 'company-1' })).toBe(true);
    expect(validateAIContext({ companyId: 'company-1', sourceCompanyId: 'company-2' })).toBe(false);
  });

  test('reaction membership is unique', () => {
    expect(uniqueReactionUsers(['a', 'a', 'b', '', 'b'])).toEqual(['a', 'b']);
  });

  test('document version increases only when a checkpoint changes content', () => {
    expect(nextDocumentVersion(4, true)).toBe(5);
    expect(nextDocumentVersion(4, false)).toBe(4);
    expect(nextDocumentVersion(-2, true)).toBe(1);
  });

  test('notification priority is mention, then reply, then normal message', () => {
    expect(classifyNotification({ senderId: 'a', recipientId: 'b', mentioned: true })).toBe('mention');
    expect(classifyNotification({ senderId: 'a', recipientId: 'b', mentioned: false, replyToMessageId: 'm1' })).toBe('reply');
    expect(classifyNotification({ senderId: 'a', recipientId: 'b', mentioned: false })).toBe('new_message');
    expect(classifyNotification({ senderId: 'a', recipientId: 'a', mentioned: true })).toBe('new_message');
  });

  test('mentions are filtered to company recipients and channel is special', () => {
    expect(extractMentionIds(['user-b', 'user-b', 'user-x', '@channel'], ['user-a', 'user-b'])).toEqual(['user-b']);
    expect(hasChannelMention(['user-b', '@CHANNEL'])).toBe(true);
  });
});
