#!/usr/bin/env bash
# Copyright (c) 2026 Hemang Parmar
#
# Provisions a fresh Ubuntu 22.04 EC2 instance for DevAssist.
#
# Idempotent — safe to re-run. The CI/CD pipeline calls this once per host to
# bring it up, then uses the systemd unit to rolling-restart the API container.
#
# Required environment variables on the runner (or set as args below):
#   ECR_REGISTRY   AWS ECR registry, e.g. 123456789012.dkr.ecr.us-east-1.amazonaws.com
#   AWS_REGION     AWS region
#   APP_TAG        Image tag to deploy (defaults to "latest")

set -euo pipefail

ECR_REGISTRY="${ECR_REGISTRY:?ECR_REGISTRY is required}"
AWS_REGION="${AWS_REGION:-us-east-1}"
APP_TAG="${APP_TAG:-latest}"
APP_DIR="/opt/devassist"
SERVICE_NAME="devassist-api"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "installing docker"
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg unzip
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker ubuntu
fi

if ! command -v aws >/dev/null 2>&1; then
  log "installing aws cli v2"
  cd /tmp
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o awscli.zip
  unzip -q awscli.zip
  sudo ./aws/install --update
  rm -rf awscli.zip aws
fi

# ---------------------------------------------------------------------------
# 2. Layout
# ---------------------------------------------------------------------------
sudo mkdir -p "${APP_DIR}"
sudo chown ubuntu:ubuntu "${APP_DIR}"

# ---------------------------------------------------------------------------
# 3. Authenticate to ECR and pull the image
# ---------------------------------------------------------------------------
log "logging in to ECR (${ECR_REGISTRY})"
aws ecr get-login-password --region "${AWS_REGION}" \
  | sudo docker login --username AWS --password-stdin "${ECR_REGISTRY}"

IMAGE="${ECR_REGISTRY}/devassist-api:${APP_TAG}"
log "pulling ${IMAGE}"
sudo docker pull "${IMAGE}"

# Tag with a stable alias so the systemd unit doesn't have to know the SHA.
sudo docker tag "${IMAGE}" "devassist-api:current"

# ---------------------------------------------------------------------------
# 4. systemd unit
# ---------------------------------------------------------------------------
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
if [[ ! -f "${UNIT_FILE}" ]]; then
  log "installing systemd unit"
  sudo cp "$(dirname "$0")/devassist-api.service" "${UNIT_FILE}"
  sudo systemctl daemon-reload
  sudo systemctl enable "${SERVICE_NAME}"
fi

if [[ ! -f "${APP_DIR}/.env" ]]; then
  log "no /opt/devassist/.env present — copy .env.production.example into place before first boot"
  sudo cp "$(dirname "$0")/.env.production.example" "${APP_DIR}/.env.example"
fi

# ---------------------------------------------------------------------------
# 5. Rolling restart
# ---------------------------------------------------------------------------
log "rolling restart"
sudo systemctl restart "${SERVICE_NAME}"

# Wait for /health before declaring success — the CI pipeline polls this exit code.
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/health >/dev/null; then
    log "health check passed"
    exit 0
  fi
  sleep 2
  log "waiting for health (${i}/30)"
done

log "health check failed after 60s"
sudo journalctl -u "${SERVICE_NAME}" --since "1 minute ago" --no-pager | tail -n 50
exit 1
