#!/bin/sh

# Create env-config.js with runtime environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  API_BASE_URL: "${API_BASE_URL:-https://compute.googleapis.com/compute/v1}",
  AUTH_DOMAIN: "${AUTH_DOMAIN:-accounts.google.com}",
  CLIENT_ID: "${CLIENT_ID:-}",
  ENVIRONMENT: "${ENVIRONMENT:-production}",
  LOG_LEVEL: "${LOG_LEVEL:-error}",
  ENABLE_ANALYTICS: "${ENABLE_ANALYTICS:-true}"
};
EOF 