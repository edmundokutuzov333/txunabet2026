# ORYON 2.0 · Phase 1 Execution Log

Data: 2026-09-15

## Completed

### Production data integrity

O caminho normal de `/dashboard` já não executa seeders de demonstração em produção.

`src/app/dashboard/layout.tsx` mantém a capacidade de dados demo apenas para desenvolvimento não produtivo e exige `ORYON_ENABLE_DEMO_SEED=true`.

Isto deixa produção sem injecção automática de fixtures `demo-*`.

### Enterprise Search runtime

`src/app/api/search/route.ts` agora declara:

- `runtime = 'nodejs'`
- `dynamic = 'force-dynamic'`
- `maxDuration = 60`

A rota usa Firebase Admin e serviços server-side, por isso o runtime fica explícito em vez de depender da inferência do framework.

### Search experience

`src/components/core/knowledge-hub-experience.tsx` deixou de executar três pesquisas paralelas de módulos para responder a uma pesquisa transversal.

Agora usa `/api/search` como contrato principal de Enterprise Search, preservando o controlo de acesso do backend e recebendo resultados lexicais + semânticos do serviço central.

Os resultados apresentam relevância e ligação para a experiência correspondente quando existe uma rota conhecida.

### Error boundaries

Foram adicionados:

- `src/app/dashboard/search/error.tsx`
- `src/app/error.tsx`

Os error boundaries registam o erro no console e oferecem recuperação sem alterar dados.

### Domain consistency

`src/app/api/goals/route.ts` passou a usar `collectionForEntity('goal')` em vez de repetir o nome da colecção localmente.

Criação e actualização de goals também publicam `goal.created` e `goal.updated` através do `event_outbox`, ligando a operação de produto ao pipeline de Domain Events, notifications e automations.

`src/server/services/foundation.ts` deixou de manter uma segunda tabela de mapeamento para referências directas. Agora usa exclusivamente `collectionForEntity()` para resolver a colecção de uma entidade, reduzindo a possibilidade de divergência entre o domínio e os serviços.

`src/server/services/legacy-modules.ts` passou a resolver as colecções de todos os módulos através do mesmo registry canónico. O endpoint existente `/api/modules/tasks` mantém o contrato HTTP, mas a persistência de Tasks, Calendar, Meetings, Files, Knowledge, Campaigns, Workflows, Automations, Reports, Integrations e Workspaces já não depende de nomes duplicados no serviço.

Foi criado `docs/ORYON-2.0-FIRESTORE-MAP.md` com o mapa canónico das colecções e as regras para não criar novas variantes.

`tests/unit/foundation.test.ts` ganhou uma guarda explícita para garantir que todas as entidades universais têm colecção canónica e que as colecções centrais de Project, Task, Goal, Workspace, Meeting e Event não mudam sem alteração intencional do contrato.

Não foi feita migração destrutiva entre colecções. A divergência `module_*` versus colecções raiz continua a ser tratada como reconciliação gradual, com o código novo a depender dos contratos centrais sempre que já existem.

## Estado pendente

O stack trace exacto do erro `MODULE_NOT_FOUND` do Vercel continua por verificar porque os logs detalhados do deployment não estão disponíveis através do acesso GitHub usado nesta execução.

O estado do último deployment Vercel deve continuar a ser tratado como não validado até o check terminar ou os logs de build ficarem disponíveis.

Também continua pendente a comparação efectiva das Environment Variables do Vercel com `.env.example`.

A consolidação física das colecções Firestore exige inventário de todos os serviços, medição de sobreposição por empresa, dry-run e testes de compatibilidade antes de qualquer apagamento ou renomeação.
