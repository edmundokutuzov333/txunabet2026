import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppCatalog } from '../../src/server/services/app-platform';
import { getIntegrationCatalog } from '../../src/server/services/integration-platform';
import { listMarketplaceTemplates } from '../../src/server/services/marketplace';

test('phase7 includes all requested first-party integration providers', () => {
  const providers = new Set(getIntegrationCatalog().map((item) => item.provider));
  for (const provider of ['google-workspace','microsoft-365','google-calendar','outlook','gmail','slack','zoom','teams','github','gitlab','google-drive','dropbox','external-api']) assert.equal(providers.has(provider), true);
});

test('phase7 app platform exposes bounded event and action catalog', () => {
  const catalog = getAppCatalog();
  assert.ok(catalog.events.includes('campaign.approved'));
  assert.ok(catalog.actions.includes('create_task'));
  assert.ok(catalog.actions.includes('run_workflow'));
});

test('phase7 marketplace contains every required template', () => {
  const names = new Set(listMarketplaceTemplates().map((item) => item.name));
  for (const name of ['Campaign Approval','Employee Onboarding','Purchase Approval','Weekly Report','Meeting Follow-up','Incident Escalation','Document Approval','Task Escalation','Leave Request','Access Request']) assert.equal(names.has(name), true);
});
