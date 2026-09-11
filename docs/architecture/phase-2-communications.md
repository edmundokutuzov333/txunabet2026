# Oryon Phase 2: Enterprise Communications

## Canonical model

`conversations/{conversationId}` stores the company-scoped conversation metadata. Supported types are `company_general`, `department`, `direct` and `group`.

Messages live below the conversation at `conversations/{conversationId}/messages/{messageId}`. Each message stores its sender, company, body, type, timestamps, reply target, attachments, mentions, reactions, soft-delete state and a client-generated idempotency key.

## Access boundaries

The browser never grants itself access to a conversation. Server services resolve the current Firebase session to an active company membership and enforce department membership or explicit conversation membership.

Firestore rules independently enforce the same boundary. Client writes to conversations and message creation are disabled so privileged mutations occur through server routes.

## Direct messages

Direct conversations use deterministic IDs based on the sorted pair of user IDs. This prevents accidental duplicate DMs for the same pair within a company.

## Realtime and history

The client listens to the latest 50 messages through a Firestore realtime listener. Older messages are loaded through cursor pagination with `endBefore`, and a local historical cache is kept so new realtime events do not discard previously loaded pages.

Message sending is optimistic and uses `clientMessageId` for idempotency. Temporary network failures are retried with exponential backoff, and the browser waits for the `online` event when disconnected.

## Reads and notifications

Per-user read state is stored under `conversations/{conversationId}/reads/{userId}`. Notification records live under `notifications/{userId}/items/{notificationId}`.

Message notifications support new-message, reply and mention semantics. The notification contract also reserves document, task and meeting notification types for subsequent phases.

## Presence and typing

Presence is stored separately from durable chat messages with a short expiration window. Typing indicators use per-user ephemeral documents under the conversation and automatically expire after a few seconds.

## Files

Conversation attachments are uploaded to Firebase Storage below the company and conversation boundary. The server validates that the attachment path belongs to the sender and target conversation before creating the message record.

## Search

Messages store normalized `searchTokens` at write time. Server-side search is company-scoped and can additionally filter by conversation, sender, department and date. Attachment names are included in the searchable token source.

## AI summaries

Gemini summaries now use an authorized server-side endpoint that reads the conversation's latest messages directly from Firestore instead of trusting a browser-supplied transcript.
