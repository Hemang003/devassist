#!/usr/bin/env bash
# Copyright (c) 2026 Hemang Parmar
#
# Reads cloudwatch_config.json and applies it via the AWS CLI. Idempotent.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CONFIG="${HERE}/cloudwatch_config.json"
REGION="${AWS_REGION:-us-east-1}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1"; exit 1; }; }
require aws
require jq

log() { printf '\033[1;34m[cloudwatch]\033[0m %s\n' "$*"; }

# Log groups -----------------------------------------------------------------
jq -c '.logGroups[]' "${CONFIG}" | while read -r row; do
  name=$(jq -r '.logGroupName' <<<"$row")
  ret=$(jq -r '.retentionInDays' <<<"$row")
  log "ensuring log group ${name}"
  aws logs create-log-group --log-group-name "${name}" --region "${REGION}" 2>/dev/null || true
  aws logs put-retention-policy --log-group-name "${name}" --retention-in-days "${ret}" --region "${REGION}"
done

# Metric filters -------------------------------------------------------------
jq -c '.metricFilters[]' "${CONFIG}" | while read -r row; do
  name=$(jq -r '.filterName' <<<"$row")
  group=$(jq -r '.logGroupName' <<<"$row")
  pattern=$(jq -r '.filterPattern' <<<"$row")
  metric=$(jq -c '.metricTransformations' <<<"$row")
  log "applying metric filter ${name}"
  aws logs put-metric-filter \
    --log-group-name "${group}" \
    --filter-name "${name}" \
    --filter-pattern "${pattern}" \
    --metric-transformations "${metric}" \
    --region "${REGION}"
done

# Alarms ---------------------------------------------------------------------
jq -c '.alarms[]' "${CONFIG}" | while read -r row; do
  name=$(jq -r '.alarmName' <<<"$row")
  log "applying alarm ${name}"
  aws cloudwatch put-metric-alarm \
    --alarm-name "${name}" \
    --metric-name "$(jq -r '.metricName' <<<"$row")" \
    --namespace "$(jq -r '.namespace' <<<"$row")" \
    --statistic "$(jq -r '.statistic' <<<"$row")" \
    --period "$(jq -r '.period' <<<"$row")" \
    --evaluation-periods "$(jq -r '.evaluationPeriods' <<<"$row")" \
    --threshold "$(jq -r '.threshold' <<<"$row")" \
    --comparison-operator "$(jq -r '.comparisonOperator' <<<"$row")" \
    --alarm-description "$(jq -r '.alarmDescription' <<<"$row")" \
    --region "${REGION}"
done

log "done"
