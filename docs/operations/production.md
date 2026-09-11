# Oryon production operations

## Deployment gates

Production changes require successful lint, TypeScript typecheck, unit tests, Firestore rules tests, Functions tests, production build and browser smoke tests.

## Observability

Use `/api/health` for service readiness and the protected `/api/metrics` endpoint for server-side latency/failure samples. Client navigation timing is sent to `/api/telemetry` without page content or secrets.

Logs are structured JSON and must never contain session cookies, authorization headers, Gemini keys, raw document contents or full chat transcripts.

## Backup policy

The scheduled `.github/workflows/firestore-backup.yml` workflow exports Firestore once per day into a dedicated backup bucket and retains the latest 30 export prefixes.

Required GitHub repository secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_BACKUP_SERVICE_ACCOUNT`
- `FIREBASE_PROJECT_ID`
- `FIRESTORE_DATABASE_ID`
- `FIRESTORE_BACKUP_BUCKET`

The backup service account should have the minimum roles required for Firestore export and writing to the dedicated backup bucket. Workload Identity Federation is preferred over long-lived JSON keys.

## Restore procedure

1. Freeze application writes or put the affected domain into maintenance mode.
2. Identify the export timestamp immediately before the incident.
3. Restore into a staging Firebase project/database first.
4. Validate users, company memberships, departments, documents, versions, conversations, messages, notifications and audit records.
5. Validate indexes and security rules against the restored dataset.
6. Promote the restored data only after application and authorization checks pass.
7. Record the incident, recovery time and any data loss window.

## Recovery targets

Until production traffic measurements exist, use provisional targets of RPO <= 24 hours for daily Firestore exports and RTO <= 4 hours for a documented restore into a clean environment. Tighten these targets after observing real business criticality and operational cost.

## Scaling

App Hosting does not use a hard single-instance cap. Capacity should be increased from observed request latency, concurrent users, memory pressure, error rate and cold-start behaviour rather than guessed traffic.

## Incident signals

Escalate sustained authentication failures, chat delivery failures, storage upload failures, AI timeouts/rate-limit spikes, elevated 5xx responses, Firestore permission errors or abnormal latency. Never disable authorization or TypeScript checks to restore service quickly.
