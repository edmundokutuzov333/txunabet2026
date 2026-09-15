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

Não foi feita migração destrutiva entre colecções. A divergência `module_*` versus colecções raiz continua a ser tratada como reconciliação gradual, com o código novo a depender dos contratos centrais sempre que já existem.

## Estado pendente

O stack trace exacto do erro `MODULE_NOT_FOUND` do Vercel continua por verificar porque os logs do deployment não estão disponíveis através do acesso GitHub usado nesta execução.

Também continua pendente a comparação efectiva das Environment Variables do Vercel com `.env.example`.

A consolidação completa das colecções Firestore `module_*` versus colecções raiz exige inventário de todos os serviços e testes de compatibilidade antes de qualquer migração de dados.
