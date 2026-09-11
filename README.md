# Oryon, Plataforma Corporativa Txuna Bet

Oryon é a plataforma interna de trabalho, comunicação e colaboração da Txuna Bet.

## Stack

- Next.js + React + TypeScript
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Functions
- Genkit + Gemini
- Zod para validação de inputs

## Arquitetura

A aplicação separa apresentação, domínio, persistência e autorização.

- `src/features/`: módulos funcionais da plataforma
- `src/lib/domain/`: contratos e modelos de domínio
- `src/lib/validation/`: schemas de entrada
- `src/server/repositories/`: acesso server-side a dados
- `src/server/services/`: regras de negócio e serviços de infraestrutura
- `src/server/authorization/`: identidade, roles, permissões e MFA

## Segurança

A autenticação usa Firebase Auth e uma sessão server-side em cookie HttpOnly. O acesso empresarial depende de uma membership ativa em `companies/{companyId}/members/{userId}`.

Firestore e Storage aplicam autorização por empresa e por recurso. O browser nunca é fonte de verdade para roles, permissões ou ownership.

Não existe criação de contas por credenciais mock. Passwords, service-account keys, Stripe secrets e tokens não pertencem ao código-fonte.

## Dados

`src/lib/data.ts` já não contém a base de dados mock original. É apenas um adaptador temporário sem dados de produção. Novos módulos devem usar dados reais através das camadas de servidor.

## Configuração local

Copie `.env.example` para `.env.local` e preencha os valores do ambiente. Segredos server-only devem permanecer sem o prefixo `NEXT_PUBLIC_`.

## Validação

```bash
npm run typecheck
npm run build
cd functions && npm install && npm run build && npm test
```

O workflow `.github/workflows/ci.yml` executa estas validações automaticamente em `main` e em pull requests.
