# Automation Platform providers

A automação usa providers externos apenas no worker server-side. As credenciais nunca devem entrar no código, Firestore ou frontend.

## Firebase Secret Manager

Configure os dois secrets no projeto Firebase antes de publicar as Functions:

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
```

O worker `automationWorkerV2`, `triggerAutomationEventV2` e `runAutomationNowV2` declaram estes secrets e só os leem no backend.

## Resend

A action `email` chama diretamente `https://api.resend.com/emails`, usa `Authorization: Bearer ...` e uma `Idempotency-Key` determinística por execução. Para produção, `from` deve ser um remetente verificado no Resend. A action aceita `to`, `subject`, `html`, `text`, `from`, `replyTo` e `headers`.

## Gemini

A action `ai` usa o Gemini API server-side. O modelo predefinido é `gemini-3.8-flash`; pode ser sobrescrito por `config.model`. A action aceita `prompt`, `systemInstruction`, `temperature`, `maxOutputTokens` e `responseMimeType` e grava apenas o resultado textual e metadados de uso em `automation_ai_results`.

## Segurança operacional

Não colocar API keys em `.env`, código TypeScript, documentos do workflow ou payloads enviados ao navegador. Não logar tokens. Em falhas de provider, o step falha normalmente e o motor aplica a política de retry/backoff do workflow; após esgotar tentativas, a execução vai para dead letter.
