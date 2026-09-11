#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${FIRESTORE_DATABASE_ID:?Set FIRESTORE_DATABASE_ID}"
: "${FIRESTORE_EXPORT_URI:?Set FIRESTORE_EXPORT_URI}"
: "${CONFIRM_RESTORE:?Set CONFIRM_RESTORE=RESTORE to continue}"

if [[ "${CONFIRM_RESTORE}" != "RESTORE" ]]; then
  echo 'Restore blocked. Set CONFIRM_RESTORE=RESTORE explicitly.' >&2
  exit 1
fi

if [[ "${GCP_PROJECT_ID}" == "prod" || "${GCP_PROJECT_ID}" == *"production"* ]]; then
  echo 'Direct production restore is blocked by this script. Restore into a staging project first.' >&2
  exit 1
fi

echo "Importing ${FIRESTORE_EXPORT_URI} into ${GCP_PROJECT_ID}/${FIRESTORE_DATABASE_ID}"
gcloud firestore import "${FIRESTORE_EXPORT_URI}" \
  --project="${GCP_PROJECT_ID}" \
  --database="${FIRESTORE_DATABASE_ID}"

echo 'Restore import submitted. Validate authorization, indexes, documents, conversations and audit records before promotion.'
