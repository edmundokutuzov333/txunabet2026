import test from 'node:test';
import assert from 'node:assert/strict';
import { getIntegrationCatalog } from '../../src/server/services/integration-platform';
import { getAppCatalog } from '../../src/server/services/app-platform';
import { listMarketplaceTemplates } from '../../src/server/services/marketplace';
import { getDRChecklist } from '../../src/server/services/disaster-recovery';

test('integration contract: every provider has stable platform metadata', () => {
  for (const provider of getIntegrationCatalog()) {
    assert.match(provider.provider, /^[a-z0-9-]+$/);
    assert.ok(provider.label);
    assert.ok(Array.isArray(provider.scopes));
    assert.equal(typeof provider.supportsRefresh, 'boolean');
    assert.equal(typeof provider.supportsWebhooks, 'boolean');
    assert.equal(typeof provider.supportsSync, 'boolean');
  }
});

test('app contract: actions and events are bounded allowlists', () => {
  const catalog = getAppCatalog();
  assert.ok(catalog.events.length > 0);
  assert.ok(catalog.actions.length > 0);
  assert.equal(new Set(catalog.events).size, catalog.events.length);
  assert.equal(new Set(catalog.actions).size, catalog.actions.length);
});

test('marketplace contract: every template is installable-shaped', () => {
  for (const template of listMarketplaceTemplates()) {
    assert.match(template.id, /^[a-z0-9-]+$/);
    assert.ok(template.steps.length >= 1);
    assert.ok(template.trigger);
  }
});

test('DR contract: recovery controls are explicit', () => {
  const dr = getDRChecklist();
  assert.equal(dr.backup, 'external_backup_required');
  assert.equal(dr.deadLetter, 'replay_supported');
  assert.equal(dr.audit, 'immutable_server_audit');
});
