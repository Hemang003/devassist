#!/usr/bin/env bash
# Copyright (c) 2026 Hemang Parmar
#
# Creates the DevAssist S3 bucket with the policies we rely on in production:
#   • Block public access (required — these are user code snippets)
#   • Versioning (so an accidental overwrite is recoverable)
#   • Server-side encryption (AES-256)
#   • Lifecycle: history older than 365 days transitions to GLACIER, deleted at 730 days

set -euo pipefail

BUCKET="${1:-${S3_BUCKET:?Pass bucket name as arg or set S3_BUCKET}}"
REGION="${AWS_REGION:-us-east-1}"

log() { printf '\033[1;34m[s3-setup]\033[0m %s\n' "$*"; }

if aws s3api head-bucket --bucket "${BUCKET}" 2>/dev/null; then
  log "bucket ${BUCKET} already exists"
else
  log "creating bucket ${BUCKET} in ${REGION}"
  if [[ "${REGION}" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}"
  else
    aws s3api create-bucket \
      --bucket "${BUCKET}" \
      --region "${REGION}" \
      --create-bucket-configuration "LocationConstraint=${REGION}"
  fi
fi

log "blocking public access"
aws s3api put-public-access-block --bucket "${BUCKET}" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

log "enabling versioning"
aws s3api put-bucket-versioning --bucket "${BUCKET}" --versioning-configuration Status=Enabled

log "enforcing AES-256 encryption"
aws s3api put-bucket-encryption --bucket "${BUCKET}" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": { "SSEAlgorithm": "AES256" },
      "BucketKeyEnabled": true
    }]
  }'

log "applying lifecycle rules"
aws s3api put-bucket-lifecycle-configuration --bucket "${BUCKET}" \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "history-cold-storage",
      "Status": "Enabled",
      "Filter": { "Prefix": "history/" },
      "Transitions": [
        { "Days": 365, "StorageClass": "GLACIER" }
      ],
      "Expiration": { "Days": 730 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    }]
  }'

log "done — ${BUCKET} ready"
