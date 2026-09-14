import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => readFile(path.join(root, file), 'utf8');

const contains = (source: string, token: string) => assert.ok(source.includes(token), `missing token: ${token}`);

test('Phase 3 core experiences expose the intended information architecture', async () => {
  const [cc, tasks, projects, chat, knowledge, ai, workflow] = await Promise.all([
    read('src/components/command-center/command-center-v3.tsx'),
    read('src/components/core/tasks-experience.tsx'),
    read('src/components/core/project-experience.tsx'),
    read('src/components/core/chat-experience.tsx'),
    read('src/components/core/knowledge-hub-experience.tsx'),
    read('src/components/core/oryon-ai-experience.tsx'),
    read('src/components/core/workflow-execution-log.tsx'),
  ]);

  for (const token of ['Priority queue', 'Today', 'Company Pulse', 'Work at risk', 'Oryon Intelligence', 'Recent activity']) contains(cc, token);
  for (const token of ['Today', 'Upcoming', 'Overdue', 'Waiting', 'Completed', 'Task inspector']) contains(tasks, token);
  for (const token of ['Overview', 'Work', 'Planning', 'Intelligence', 'Board', 'Timeline', 'Calendar', 'Resources', 'Goals', 'Budget', 'Risks', 'Activity', 'Time']) contains(projects, token);
  for (const token of ['Channels / DMs', 'Context', 'AI']) contains(chat, token);
  for (const token of ['Knowledge', 'Search', 'Docs', 'Files']) contains(knowledge, token);
  for (const token of ['Ask Oryon', 'Operations', 'Projects', 'Meetings', 'Knowledge', 'Reports', 'Automation', 'Oryon Intelligence']) contains(ai, token);
  contains(workflow, 'Execution log');
  contains(workflow, '/api/automation-engine?resource=jobs');
});

test('Core experiences keep real backend contracts', async () => {
  const [cc, tasks, projects, ai] = await Promise.all([
    read('src/components/command-center/command-center-v3.tsx'),
    read('src/components/core/tasks-experience.tsx'),
    read('src/components/core/project-experience.tsx'),
    read('src/components/core/oryon-ai-experience.tsx'),
  ]);

  contains(cc, '/api/command-center');
  contains(tasks, '/api/modules/tasks');
  contains(projects, '/api/project-os');
  contains(ai, '/api/ai/agents');
});
