import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(file:string){return fs.readFileSync(path.join(root,file),'utf8');}

test('rule 1: core feature path has entity, permission, event, audit and operational projections',()=>{
  const resources=read('src/server/authorization/resources.ts');
  const foundation=read('src/server/services/foundation.ts');
  const modules=read('src/server/services/legacy-modules.ts');
  assert.match(resources,/task:/);
  assert.match(resources,/project:/);
  assert.match(resources,/campaign:/);
  assert.match(resources,/meeting:/);
  assert.match(foundation,/queueDomainEventTransaction/);
  assert.match(foundation,/recordAuditMutation/);
  assert.match(modules,/requirePermission/);
  assert.match(modules,/writeAuditEvent/);
  assert.match(modules,/publishDomainEvent/);
});

test('rule 2: domain events feed activity, notifications and automation',()=>{
  const outbox=read('functions/src/domain-event-outbox.ts');
  assert.match(outbox,/notifications/);
  assert.match(outbox,/activities/);
  assert.match(outbox,/automation_jobs/);
  assert.match(outbox,/event_outbox/);
});

test('rule 3: dashboards use operational services instead of client mock state',()=>{
  const analyticsRoute=read('src/app/api/analytics/route.ts');
  const chart=read('src/app/dashboard/analytics/_components/user-activity-chart.tsx');
  assert.match(analyticsRoute,/getModuleAnalytics/);
  assert.match(chart,/apiFetch<AnalyticsResponse>\('\/api\/analytics'\)/);
  assert.doesNotMatch(chart,/@\/lib\/data/);
});

test('rule 4: AI contract is evidence-first and tool-authoritative for writes',()=>{
  const gateway=read('src/server/services/ai-core.ts');
  const operations=read('src/server/services/intelligent-operations.ts');
  assert.match(gateway,/Never invent metrics/);
  assert.match(gateway,/write operation must be expressed as a tool call/);
  assert.match(operations,/AgentPlanSchema\.parse/);
  assert.match(operations,/executeAITool/);
});

test('rule 5: primary workflow and form journeys terminate in server APIs',()=>{
  const workflow=read('src/components/workflow/react-flow-workflow-builder.tsx');
  const forms=read('src/components/forms/form-builder-view.tsx');
  assert.match(workflow,/\/api\/workflow-platform/);
  assert.match(workflow,/visual\.save/);
  assert.match(workflow,/visual\.publish/);
  assert.match(workflow,/execution\.run/);
  assert.match(forms,/\/api\/forms/);
  assert.match(forms,/zodResolver/);
  assert.match(forms,/useForm/);
});

test('AI context and search remain behind a server-side boundary',()=>{
  const search=read('src/server/services/enterprise-context.ts');
  const tools=read('src/server/services/ai-tools.ts');
  assert.match(search,/enterpriseSearch/);
  assert.match(search,/companyId/);
  assert.match(search,/visible/);
  assert.match(tools,/searchOryon/);
});
