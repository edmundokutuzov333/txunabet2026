# Oryon Foundation Architecture

## Identity boundary

The browser authenticates with Firebase Auth, then exchanges the fresh Firebase ID token for an HttpOnly `__session` cookie. Server code verifies that cookie, resolves the user's active company membership, and derives the effective role and permissions from Firestore membership data.

The canonical identity model is:

- `companies/{companyId}`
- `departments/{departmentId}`
- `users/{userId}`
- `companies/{companyId}/members/{userId}`
- `departments/{departmentId}/members/{userId}`

The browser may display role and permission state, but cannot grant itself access.

## Authorization boundary

Server services use `requireIdentity`, `requirePermission`, `requireDepartmentMember`, and `requireMfa`. Firestore rules independently verify company membership and resource ownership. Firebase Storage rules enforce the same company boundary for uploaded objects.

## Storage boundary

All managed files are scoped below:

`companies/{companyId}/users/{userId}/...`

`companies/{companyId}/conversations/{conversationId}/attachments/...`

`companies/{companyId}/documents/{documentId}/assets/...`

Metadata belongs in Firestore and the binary belongs in Storage. Server-side signed download URLs are short-lived.

## Data boundary

`src/lib/data.ts` is now a transitional compatibility adapter with no credentials or fabricated business records. It is not a source of truth. New production functionality must use the domain, repository, service and authorization layers.

## Financial boundary

Financial transaction records use one canonical shape with `companyId`, `userId`, `externalId`, `source`, `amount`, `currency`, `status`, timestamps and metadata. Client-side writes to transactions are disabled.

Firebase Auth user identity and Stripe customer identity are intentionally separate. A Firebase UID is stored as application metadata, not passed as an arbitrary Stripe customer identifier.

## Secret handling

Server-only secrets are provided through runtime configuration. Firebase web configuration uses `NEXT_PUBLIC_FIREBASE_*` values. No service-account private key, Stripe secret or password belongs in source control.

Previously committed test credentials must be treated as compromised even after deletion from the working tree. Credential rotation and history purge remain operational actions that require access to the actual Firebase/GitHub administration surfaces.
