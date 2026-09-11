import { describe, expect, test } from 'node:test';
import {
  canAccessConversation,
  canDirectMessage,
  canShareWithDepartment,
  canShareWithUser,
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
});
