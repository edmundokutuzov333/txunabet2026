import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')) as {dependencies?:Record<string,string>;devDependencies?:Record<string,string>};
const deps={...(pkg.dependencies??{}),...(pkg.devDependencies??{})};

function walk(dir:string):string[]{const result:string[]=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.next','.git'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())result.push(...walk(full));else if(/\.(ts|tsx|js|mjs)$/.test(entry.name))result.push(full);}return result;}

const sourceFiles=walk(path.join(root,'src'));

function read(relative:string):string{return fs.readFileSync(path.join(root,relative),'utf8');}
function normalize(file:string):string{return file.split(path.sep).join('/');}
function isAppNonApiFile(file:string):boolean{const normalized=normalize(file);return normalized.includes('/src/app/')&&!normalized.includes('/src/app/api/');}

test('required frontend stack is installed',()=>{
  for(const name of ['next','react','typescript','@tanstack/react-query','react-hook-form','zod','recharts','@xyflow/react']) assert.ok(deps[name],`missing dependency: ${name}`);
});

test('required backend and E2E stack is installed',()=>{
  for(const name of ['firebase','firebase-admin','firebase-functions','@playwright/test','server-only']) assert.ok(deps[name],`missing dependency: ${name}`);
});

test('Genkit/Gemini boundary is centralized',()=>{
  const violations=sourceFiles.filter((file)=>{const content=fs.readFileSync(file,'utf8');if(file.endsWith('/src/ai/genkit.ts'))return false;return content.includes("@genkit-ai/google-genai");});
  assert.deepEqual(violations.map((f)=>path.relative(root,f)),['src/server/services/ai-core.ts']);
  for(const file of sourceFiles.filter(isAppNonApiFile)){const content=fs.readFileSync(file,'utf8');assert.ok(!content.includes("@genkit-ai/google-genai"),`page imports Gemini directly: ${path.relative(root,file)}`);}
});

test('React Flow is used by the production workflow surface',()=>{
  const file=read('src/components/workflow/react-flow-workflow-builder.tsx');
  assert.match(file,/from '@xyflow\/react'/);
  assert.match(file,/<ReactFlow[\s>]/);
});

test('TanStack Query is used for request-response UI data',()=>{
  const provider=read('src/components/query-provider.tsx');
  assert.match(provider,/QueryClientProvider/);
  const workflow=read('src/components/workflow/react-flow-workflow-builder.tsx');
  assert.match(workflow,/useQuery/);
  const analytics=read('src/app/dashboard/analytics/_components/user-activity-chart.tsx');
  assert.match(analytics,/useQuery/);
});

test('Realtime remains Firebase listener based',()=>{
  const file=read('src/firebase/firestore/use-collection.tsx');
  assert.match(file,/onSnapshot/);
});

test('automation pipeline has durable workers and receipts',()=>{
  assert.ok(fs.existsSync(path.join(root,'functions/src/automation-engine-v2.ts')));
  assert.ok(fs.existsSync(path.join(root,'functions/src/domain-event-outbox.ts')));
  assert.ok(fs.existsSync(path.join(root,'functions/src/phase7-scheduled.ts')));
});

test('server pages and layouts do not access the Admin Firestore SDK directly',()=>{
  const violations=sourceFiles.filter((file)=>isAppNonApiFile(file)&&fs.readFileSync(file,'utf8').includes('getAdminDb('));
  assert.deepEqual(violations.map((f)=>path.relative(root,f)),[]);
});

test('direct messages route stays client-only and never calls client auth from a server page',()=>{
  const file=read('src/app/dashboard/chat/direct/page.tsx');
  assert.match(file,/^['"]use client['"];?/);
  assert.doesNotMatch(file,/getCurrentUser\s*\(/);
  assert.doesNotMatch(file,/from ['"]@\/lib\/data['"]/);
});

test('server-only guards are present on server service modules',()=>{
  for(const relative of ['src/server/services/ai-core.ts','src/server/services/app-platform.ts','src/server/services/security-hardening.ts']) {
    assert.match(read(relative),/^import ['"]server-only['"];/,`missing server-only guard: ${relative}`);
  }
});