# ORYON 2.0 Repository Audit

**Data da auditoria:** 2026-09-15  
**Repositório:** `edmundokutuzov333/txunabet2026`  
**Branch:** `main`  
**Objectivo:** cumprir o passo zero definido no prompt-mestre ORYON 2.0 antes de alterar a implementação.

> **Nota de método:** esta auditoria foi construída a partir do código actualmente acessível no GitHub, dos ficheiros de configuração do repositório e da especificação ORYON 2.0 anexada pelo responsável do projecto. Os pontos que dependem de Vercel ou do ambiente de produção e que não são expostos pelo conector GitHub estão explicitamente marcados como **NÃO VERIFICADO**. Não foram inventados valores nem logs.

## 1. Framework e versão

- Framework: Next.js `15.0.7`.
- Router: Next.js App Router, com páginas em `src/app`.
- Frontend: React `18.3.1` + TypeScript `5`.
- CSS/UI: Tailwind CSS `3.4.1`, componentes Radix e biblioteca interna `src/components/oryon-ui`.
- Estado/integração: TanStack React Query `5.x`, React Hook Form.
- IA: Genkit `1.21.0` + `@genkit-ai/google-genai` `1.21.0`.
- Backend: Firebase Auth, Firestore, Storage e Cloud Functions.
- Runtime das Functions: Node.js 20.
- Package manager declarado: npm 10.
- Testes existentes: unit, integration, contract, rules e Playwright E2E.

## 2. Firebase Admin SDK e variáveis de ambiente

### Implementação actual

`src/server/firebase/admin.ts` é `server-only` e inicializa Firebase Admin de duas formas:

1. Service account via `FIREBASE_SERVICE_ACCOUNT_JSON`.
2. `applicationDefault()` quando não existe service account JSON.

O projecto e o Firestore podem ser seleccionados por `FIREBASE_PROJECT_ID` e `FIREBASE_FIRESTORE_DATABASE_ID`. O Storage usa `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

### Variáveis esperadas pelo repositório

Server-side:

- `GEMINI_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_FIRESTORE_DATABASE_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `STRIPE_API_KEY`
- variáveis de teste relacionadas com bypass/autenticação, quando usadas localmente

Client/public Firebase:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Estado:** código e `.env.example` verificados. Os valores reais do Vercel **NÃO VERIFICADOS** através da ligação disponível.

### Divergência com ORYON 2.0

O prompt-mestre propõe variáveis server-side `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`, enquanto o repositório actual usa `FIREBASE_SERVICE_ACCOUNT_JSON`. Não se deve introduzir um segundo contrato de credenciais sem reconciliação.

## 3. Inventário Firestore actualmente identificado

O inventário abaixo foi reconstruído a partir de `firestore.rules`, `src/server/domain/entities.ts` e dos serviços que fazem acesso ao Firestore. O code search remoto não permitiu uma pesquisa `.collection(` completa e verificável sobre cada ficheiro do repositório; por isso, esta lista é **abrangente pelos contratos e fontes observados, mas não é declarada como grep exaustivo**.

### Colecções raiz observadas

- `companies`
- `departments`
- `users`
- `conversations`
- `notifications`
- `notification_preferences`
- `activities`
- `documents`
- `docs`
- `transactions`
- `tasks`
- `module_tasks`
- `projects`
- `module_workspaces`
- `goals`
- `key_results`
- `module_campaigns`
- `game_operations`
- `module_meetings`
- `module_calendar_events`
- `messages`
- `module_cloud_files`
- `module_knowledge_articles`
- `module_decisions`
- `approvals`
- `approval_instances`
- `approval_history`
- `forms`
- `form_submissions`
- `module_workflows`
- `module_automations`
- `automation_jobs`
- `automation_runs`
- `automation_run_steps`
- `automation_logs`
- `automation_dead_letters`
- `automation_step_receipts`
- `automation_concurrency`
- `automation_rate_limits`
- `automation_action_requests`
- `event_outbox`
- `enterprise_search_index`
- `risks`
- `incidents`
- `reports`
- `module_reports`
- `integrations`
- `module_integrations`
- `integration_connections`
- `integration_oauth_states`
- `integration_secrets`
- `integration_webhooks`
- `integration_sync_jobs`
- `whiteboards`
- `module_clips`
- `enterprise_policies`
- `observability_metrics`
- `observability_alerts`
- `dr_manifests`
- `system_configs`
- `ai_usage`
- `oryon_apps`
- `oryon_app_secrets`
- `oryon_app_webhooks`
- `marketplace_installations`
- `security_events`
- `sessions`
- `payments`
- `players`
- `bet_ledger`
- `trading_events`
- `responsible_gaming_cases`
- `vip_accounts`
- `affiliates`
- `support_tickets`
- e outras colecções de domínio de apostas referenciadas pelos seeders e módulos.

### Subcolecções observadas

- `companies/{companyId}/members`
- `companies/{companyId}/auditLogs`
- `companies/{companyId}/system`
- `companies/{companyId}/departments`
- `companies/{companyId}/notifications`
- `companies/{companyId}/event_outbox` aparece no contrato do prompt ORYON 2.0, mas o código actual observado trabalha também com `event_outbox` raiz. Isto é uma divergência a reconciliar.
- `companies/{companyId}/automation_jobs` aparece no contrato ORYON 2.0, enquanto o worker actual usa `automation_jobs` raiz.
- `notifications/{userId}/items`
- `conversations/{conversationId}/messages`
- `documents/{documentId}/versions`
- `documents/{documentId}/comments`
- `approvals/{approvalId}/history`
- `forms/{formId}/versions`
- `automation_runs/{runId}/steps`

### Mapeamento universal actualmente declarado em `entities.ts`

- `company` → `companies`
- `department` → `departments`
- `team` → `teams`
- `user` → `users`
- `workspace` → `module_workspaces`
- `project` → `projects`
- `task` → `module_tasks`
- `goal` → `goals`
- `key_result` → `key_results`
- `campaign` → `module_campaigns`
- `meeting` → `module_meetings`
- `event` → `module_calendar_events`
- `message` → `messages`
- `channel` → `conversations`
- `document` → `documents`
- `file` → `module_cloud_files`
- `knowledge_article` → `module_knowledge_articles`
- `decision` → `decisions`
- `form` → `forms`
- `form_submission` → `form_submissions`
- `approval` → `approvals`
- `workflow` → `module_workflows`
- `workflow_version` → `module_workflows`
- `automation` → `module_automations`
- `automation_job` → `automation_jobs`
- `automation_run` → `automation_runs`
- `report` → `module_reports`
- `incident` → `incidents`
- `risk` → `risks`
- `notification` → `notifications`
- `activity` → `activities`
- `integration` → `module_integrations`

## 4. Rotas e páginas existentes

### Top-level

- `/`
- `/login`
- `/login/signup`
- `/forgot-password`

### Dashboard

As rotas de dashboard verificadas ou identificadas na árvore actual incluem:

- `/dashboard`
- `/dashboard/admin/enterprise`
- `/dashboard/affiliates`
- `/dashboard/analytics`
- `/dashboard/approvals`
- `/dashboard/automation-observability`
- `/dashboard/automations`
- `/dashboard/calendar`
- `/dashboard/call/[userId]`
- `/dashboard/campaigns`
- `/dashboard/campaigns/[campaignId]`
- `/dashboard/chat/department`
- `/dashboard/chat/direct`
- `/dashboard/chat/direct/[userId]`
- `/dashboard/chat/general`
- `/dashboard/cloud`
- `/dashboard/collaboration`
- `/dashboard/departments`
- `/dashboard/departments/[department]`
- `/dashboard/departments/compliance`
- `/dashboard/departments/finance`
- `/dashboard/departments/hr`
- `/dashboard/departments/it`
- `/dashboard/departments/marketing`
- `/dashboard/departments/operations`
- `/dashboard/departments/security`
- `/dashboard/departments/team`
- `/dashboard/document-editor`
- `/dashboard/documents`
- `/dashboard/forms`
- `/dashboard/goals`
- `/dashboard/inbox`
- `/dashboard/integrations`
- `/dashboard/knowledge-base`
- `/dashboard/marketplace`
- `/dashboard/meetings`
- `/dashboard/operations`
- `/dashboard/oryon-ai`
- `/dashboard/payments`
- `/dashboard/players`
- `/dashboard/profile`
- `/dashboard/projects`
- `/dashboard/pulse`
- `/dashboard/reports`
- `/dashboard/responsible-gaming`
- `/dashboard/risk`
- `/dashboard/search`
- `/dashboard/security`
- `/dashboard/settings`
- `/dashboard/sportsbook`
- `/dashboard/support`
- `/dashboard/tasks`
- `/dashboard/team`
- `/dashboard/vip`
- `/dashboard/workflows`
- `/dashboard/workspaces`
- `/dashboard/workspaces/[workspaceId]`

Segment files relevantes também existentes:

- `/dashboard/error.tsx`
- `/dashboard/loading.tsx`
- `/dashboard/layout.tsx`

### APIs principais verificadas

- `/api/ai`
- `/api/search`
- `/api/command-center`
- `/api/notifications`
- `/api/documents`
- `/api/goals`
- `/api/users/directory`
- `/api/security`
- `/api/profile`
- `/api/settings`
- `/api/modules/[module]`
- `/api/automation-engine`
- `/api/workflow-platform`
- `/api/auth/*`
- APIs de administração, analytics, calendar, chat, betting operations e integrações também existem no código.

## 5. Gemini: onde e como é chamado

### Genkit

`src/ai/genkit.ts` configura:

- plugin `@genkit-ai/google-genai`
- API key lida de `process.env.GEMINI_API_KEY`
- modelo configurado actualmente: `googleai/gemini-2.5-flash`

**Divergência:** o prompt ORYON 2.0 assume `gemini-3.1-pro-preview` ou o modelo configurado no AI Studio. A versão real encontrada no repositório é `gemini-2.5-flash`. Não alterar só por este documento sem validar disponibilidade, custo e impacto.

### Pesquisa semântica

`src/server/services/enterprise-context.ts` também chama directamente a API Google Generative Language para embeddings com `gemini-embedding-001`. O método usa `GEMINI_API_KEY` e faz indexação na colecção `enterprise_search_index`.

### API OryonAI

`src/app/api/ai/route.ts` declara runtime `nodejs`, valida pedidos com Zod e delega para o serviço de IA. Isto evita chamar a IA directamente a partir do browser nesta rota.

## 6. Cloud Functions, workers e automação

Existe infraestrutura funcional e não apenas um desenho em texto.

### Outbox

`functions/src/domain-event-outbox.ts` implementa um worker agendado a cada minuto, na região `africa-south1`, usando:

- lote máximo de 50 eventos por ciclo;
- lease de 8 minutos;
- limite actual de 8 tentativas;
- retry inicial de 30 segundos com backoff exponencial limitado a 15 minutos;
- materialização idempotente de notifications e activities;
- geração de action items de reuniões em `module_tasks`;
- enqueue de jobs de automação em `automation_jobs`.

### Automation

Existem ainda `automation-engine-v2.ts`, `automation-engine.ts`, `automation-cron-core.ts`, `automation-graph-core.ts` e `automation-providers.ts`, além de testes dedicados.

### Firebase

`firebase.json` define Functions em `functions`, runtime Node 20, Firestore rules/indexes e emuladores locais.

## 7. `MODULE_NOT_FOUND` em Search

### Evidência disponível no código

- `/dashboard/search` renderiza a experiência de Knowledge/Search.
- `/api/search` importa `enterpriseSearch` e `getKnowledgeGraph` de `src/server/services/enterprise-context.ts`.
- Não foi identificado um `export const runtime = 'edge'` na rota `/api/search`.
- O endpoint usa imports server-side e Firebase Admin indirectamente.

### Error boundaries

- `src/app/dashboard/error.tsx` **existe**.
- `src/app/error.tsx` **não existe actualmente**.
- `src/app/dashboard/search/error.tsx` **não existe actualmente**.

### Stack trace exacto

**NÃO VERIFICADO.** O conector GitHub não fornece os Function Logs do Vercel com o nome exacto do módulo que provocou `MODULE_NOT_FOUND`. O código não deve ser alterado com base numa suposição sobre o módulo ausente.

Diagnóstico pendente obrigatório no Vercel:

1. abrir logs do deploy que apresentou o erro;
2. obter o stack trace completo;
3. confirmar o módulo ausente;
4. comparar imports e casing com o filesystem Linux;
5. confirmar dependência e lockfile;
6. depois corrigir a causa raiz e manter error boundary como rede de segurança.

## 8. Variáveis Vercel

### O que é possível confirmar

`.env.example` documenta as variáveis esperadas pelo projecto.

### O que não é possível confirmar via GitHub

**NÃO VERIFICADO:** lista efectiva de Environment Variables configuradas em Vercel para Production/Preview/Development e comparação exacta com as variáveis lidas pelo código.

Não foi inventado nenhum valor de secret nem qualquer estado do ambiente Vercel.

## 9. Descobertas críticas

### CRÍTICO 1: seed de demonstração é injectado no fluxo normal do dashboard

`src/app/dashboard/layout.tsx` chama `ensureDemoData(identity)` e `ensureDemoDataExtra(identity)` durante o carregamento do dashboard.

Os dois seeders criam grandes conjuntos de utilizadores, departamentos, projectos, tarefas, reuniões, documentos, goals, riscos e dados específicos da operação, com IDs prefixados `demo-*`.

Isto contradiz directamente o princípio ORYON 2.0 de zero mocks em produção. Deve ser removido do caminho normal ou isolado por um mecanismo explícito de ambiente/demo antes da validação final do backend real.

### CRÍTICO 2: o repositório já tem arquitectura real. Não reconstruir

Já existem contratos universais, Zod schemas, RBAC, services server-side, outbox, workers e várias experiências ligadas ao backend.

A estratégia correcta é consolidar e corrigir, não gerar uma segunda aplicação paralela.

### CRÍTICO 3: colecções e paths ainda não estão unificados

O modelo universal aponta para colecções `module_*`, enquanto outros serviços usam colecções sem esse prefixo. O prompt ORYON 2.0 propõe ainda outra convenção de paths aninhados em `companies/{companyId}/...`.

Antes de criar novos repositórios, definir uma matriz de compatibilidade e preservar dados existentes. Não migrar dados destrutivamente nesta fase.

### CRÍTICO 4: audit log actual não guarda traceId

`src/server/repositories/audit.ts` grava `companyId`, `actorId`, `action`, `resourceType`, `resourceId`, metadata e `createdAt`, mas não recebe nem persiste um `traceId` explícito.

Isto significa que o requisito ORYON 2.0 de `traceId` único por evento ainda não está implementado neste repositório de auditoria.

### CRÍTICO 5: Search devolve códigos técnicos em alguns caminhos

`/api/modules/[module]` usa `MODULE_NOT_FOUND` como código de erro funcional para módulos não suportados e `/api/search` devolve `error.message` em erro genérico. É preciso separar código interno de mensagem apresentada ao utilizador.

### CRÍTICO 6: claims/RBAC precisam de reconciliação com a implementação existente

O prompt ORYON 2.0 propõe claims `{ companyId, role, permissions }`. O projecto actual já possui `src/server/authorization` e membership em `companies/{companyId}/members/{userId}`.

Não substituir a autorização existente sem testes. O objectivo é obter o comportamento exigido com a arquitectura actual.

### CRÍTICO 7: README contradiz o runtime

O README descreve a aplicação como sem mock database original e orientada para dados reais. Porém, o layout do dashboard chama activamente os seeders demo. A documentação e o comportamento real precisam ser reconciliados.

## 10. O que já está funcional e deve ser preservado

- Command Center tem serviço server-side próprio e agrega tarefas, reuniões, projectos, campanhas, approvals, riscos, incidentes, goals, automações e actividade.
- Inbox usa backend real através de `/api/command-center?resource=inbox`.
- Goals já cria e actualiza através de `/api/goals` e possui estado vazio com CTA.
- People/Team já carrega `/api/users/directory` com loading/error/empty states.
- Documents carrega `/api/documents` e tem criação através do editor.
- Automations e Workflows já têm superfícies específicas e não dependem apenas de um placeholder visual.
- Chat geral já cria/obtém a conversa empresarial e carrega mensagens via backend.
- Security já lê e altera MFA, password e sessões através do backend/Firebase.
- Settings já persiste preferências no backend.
- O shell Oryon e os tokens visuais já existem. Não devem ser reescritos só para seguir outra estrutura.

## 11. Estado dos requisitos ORYON 2.0

| Requisito | Estado |
|---|---|
| Auditoria criada antes de código | ✅ este documento |
| Stack identificada | ✅ |
| Firebase Admin identificado | ✅ |
| Colecções inventariadas | ⚠️ abrangente, grep total não verificável via connector |
| Rotas principais identificadas | ✅ |
| Gemini identificado | ✅ |
| Workers/Cloud Functions identificados | ✅ |
| Stack trace Vercel | ❌ não acessível via GitHub |
| Environment Variables reais do Vercel | ❌ não acessíveis via GitHub |
| Zero mocks em produção | ❌ contradito pelo dashboard seed |
| Error boundary global | ❌ `src/app/error.tsx` ausente |
| Search error boundary específico | ❌ ausente |
| Audit traceId explícito | ❌ ausente no `writeAuditEvent` actual |
| Outbox real | ✅ |
| Automation worker real | ✅ |
| RBAC server-side | ✅ base existente, precisa de reconciliação |
| Design tokens Oryon | ✅ já existem |

## 12. Gate para iniciar a Fase 1

A especificação ORYON 2.0 exige que esta auditoria exista e seja confirmada antes da execução da Fase 1.

A partir desta auditoria, a primeira implementação deve ser tratada como **consolidação da arquitectura existente**, não como reconstrução.

Antes de escrever código da Fase 1, ficam registados dois pontos externos não verificáveis neste ambiente:

1. stack trace completo do `MODULE_NOT_FOUND` no Vercel;
2. lista efectiva de Environment Variables do Vercel.

O primeiro passo de implementação, depois da confirmação desta auditoria, deve ser a remoção/gating do seed demo do caminho normal e a criação da camada de ambiente/error boundary sem quebrar a arquitectura Firebase existente.
