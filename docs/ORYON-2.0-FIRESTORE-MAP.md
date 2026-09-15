# ORYON 2.0 · Firestore Canonical Map

Data: 2026-09-15

## Objectivo

Oryon tem actualmente uma combinação de colecções raiz e colecções `module_*`. Esta fase não faz renomeações nem cópias de dados. Em vez disso, define explicitamente qual é a colecção canónica de cada entidade para que o código novo não crie uma terceira variante.

## Colecções canónicas por entidade

| Entidade | Colecção canónica | Nota |
| --- | --- | --- |
| company | `companies` | Core multi-tenant |
| department | `departments` | Core organizacional |
| team | `teams` | Core organizacional |
| user | `users` | Perfil; membership operacional vive em `companies/{companyId}/members` |
| workspace | `module_workspaces` | Workspace do Project OS |
| project | `projects` | Project OS |
| task | `module_tasks` | Task service/module contract |
| goal | `goals` | Goals e OKR |
| key_result | `key_results` | OKR |
| campaign | `module_campaigns` | Marketing |
| meeting | `module_meetings` | Meetings |
| event | `module_calendar_events` | Calendar |
| message | `messages` | Mensagens, com estrutura dependente do canal |
| channel | `conversations` | Conversas/canais |
| document | `documents` | Documentos |
| file | `module_cloud_files` | Cloud/File module |
| knowledge_article | `module_knowledge_articles` | Knowledge |
| decision | `decisions` | Decisões |
| form | `forms` | Forms |
| form_submission | `form_submissions` | Forms |
| approval | `approvals` | Workflow/approval |
| workflow | `module_workflows` | Control plane |
| workflow_version | `module_workflows` | Validado como variante de workflow, não como colecção separada |
| automation | `module_automations` | Control plane |
| automation_job | `automation_jobs` | Runtime |
| automation_run | `automation_runs` | Runtime |
| report | `module_reports` | Reporting |
| incident | `incidents` | Risk/incident |
| risk | `risks` | Risk |
| notification | `notifications` | Entidade lógica; items podem viver em subcolecções por utilizador |
| activity | `activities` | Activity feed |
| integration | `module_integrations` | Integration control plane |

## Regras para código novo

1. O código de domínio deve resolver a colecção através de `collectionForEntity()` em `src/server/domain/entities.ts` sempre que está a operar sobre uma entidade do domínio.
2. Um módulo não deve introduzir uma segunda colecção para a mesma entidade apenas porque uma API antiga usa outro nome.
3. Não copiar dados entre colecções em runtime para "sincronizar" os dois modelos.
4. Qualquer migração de dados futura deve ser uma operação explícita, idempotente, observável e reversível.
5. Colecções auxiliares como `entity_relationships`, `capacity_allocations`, `time_entries`, `task_subtasks` e `project_milestones` não são entidades alternativas. São estruturas de suporte ao Project OS.

## Estado actual

`src/server/services/foundation.ts` já resolve referências directas através do registry canónico. `project-os.ts` já usa `projects`, `goals` e `module_*` de acordo com este mapa e publica Domain Events para as mutações principais.

A coexistência de colecções raiz e `module_*` continua permitida para as entidades acima. O objectivo desta unidade é impedir nova deriva arquitectural, não fingir que os dados históricos já foram migrados.

## Próxima migração segura

Antes de qualquer consolidação física, é necessário medir existência, volume e sobreposição por empresa entre eventuais pares candidatos. Só depois deve ser criado um job de migração com dry-run, relatório de conflitos, idempotência e confirmação explícita antes de apagar a origem.
