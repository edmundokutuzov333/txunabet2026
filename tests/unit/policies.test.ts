import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
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
    assert.equal(canAccessConversation(marketing, { companyId: 'company-1', type: 'company_general' }), true);
  });

  test('allows same-department access and denies a different department', () => {
    assert.equal(canAccessConversation(marketing, { companyId: 'company-1', type: 'department', departmentId: 'marketing' }), true);
    assert.equal(canAccessConversation(marketing, { companyId: 'company-1', type: 'department', departmentId: 'finance' }), false);
  });

  test('direct conversations stay inside the company', () => {
    assert.equal(canDirectMessage(marketing, { uid: 'user-b', companyId: 'company-1', active: true }), true);
    assert.equal(canDirectMessage(marketing, { uid: 'user-b', companyId: 'company-2', active: true }), false);
    assert.equal(canDirectMessage(marketing, { uid: 'user-a', companyId: 'company-1', active: true }), false);
  });

  test('document shares reject external or inactive users', () => {
    assert.equal(canShareWithUser(marketing, { uid: 'user-b', companyId: 'company-1', active: true }, 'editor'), true);
    assert.equal(canShareWithUser(marketing, { uid: 'user-c', companyId: 'company-2', active: true }, 'viewer'), false);
    assert.equal(canShareWithUser(marketing, { uid: 'user-d', companyId: 'company-1', active: false }, 'viewer'), false);
  });

  test('department sharing is company-scoped', () => {
    assert.equal(canShareWithDepartment(marketing, { companyId: 'company-1', departmentId: 'finance' }), true);
    assert.equal(canShareWithDepartment(marketing, { companyId: 'company-2', departmentId: 'finance' }), false);
  });

  test('search tokenization is normalized and bounded', () => {
    assert.deepEqual(normalizeSearchTokens('Olá, MARKETING! risco risco campanha'), ['ola', 'marketing', 'risco', 'campanha']);
  });

  test('AI input is sanitized and bounded', () => {
    assert.equal(sanitizeAIInput('  hello\u0000\nworld  '), 'hello\nworld');
    assert.equal(sanitizeAIInput('x'.repeat(50), 12).length, 12);
  });

  test('AI context cannot cross companies', () => {
    assert.equal(validateAIContext({ companyId: 'company-1', sourceCompanyId: 'company-1' }), true);
    assert.equal(validateAIContext({ companyId: 'company-1', sourceCompanyId: 'company-2' }), false);
  });

  test('reaction membership is unique', () => {
    assert.deepEqual(uniqueReactionUsers(['a', 'a', 'b', '', 'b']), ['a', 'b']);
  });

  test('document version increases only when a checkpoint changes content', () => {
    assert.equal(nextDocumentVersion(4, true), 5);
    assert.equal(nextDocumentVersion(4, false), 4);
    assert.equal(nextDocumentVersion(-2, true), 1);
  });

  test('notification priority is mention, then reply, then normal message', () => {
    assert.equal(classifyNotification({ senderId: 'a', recipientId: 'b', mentioned: true }), 'mention');
    assert.equal(classifyNotification({ senderId: 'a', recipientId: 'b', mentioned: false, replyToMessageId: 'm1' }), 'reply');
    assert.equal(classifyNotification({ senderId: 'a', recipientId: 'b', mentioned: false }), 'new_message');
    assert.equal(classifyNotification({ senderId: 'a', recipientId: 'a', mentioned: true }), 'new_message');
  });

  test('mentions are filtered to company recipients and channel is special', () => {
    assert.deepEqual(extractMentionIds(['user-b', 'user-b', 'user-x', '@channel'], ['user-a', 'user-b']), ['user-b']);
    assert.equal(hasChannelMention(['user-b', '@CHANNEL']), true);
  });
});
