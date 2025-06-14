#!/bin/sh

# Create env-config.js with runtime environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  // API Configuration
  API_BASE_URL: "${API_BASE_URL:-https://cloudconsolevibe-backend-6anbejtsta-uc.a.run.app}",
  AUTH_DOMAIN: "${AUTH_DOMAIN:-accounts.google.com}",
  ENVIRONMENT: "${ENVIRONMENT:-production}",
  LOG_LEVEL: "${LOG_LEVEL:-error}",
  
  // Google Services
  GOOGLE_CLIENT_ID: "${GOOGLE_CLIENT_ID:-}",
  GOOGLE_ANALYTICS_ID: "${GOOGLE_ANALYTICS_ID:-}",
  GEMINI_API_KEY: "${GEMINI_API_KEY:-}",
  ENABLE_ANALYTICS: "${ENABLE_ANALYTICS:-true}",
  
  // AppNeta Configuration
  APPNETA_API_BASE_URL: "${APPNETA_API_BASE_URL:-https://demo.pm.appneta.com/api/v3}",
  APPNETA_API_KEY: "${APPNETA_API_KEY:-}",
  APPNETA_DEMO_MODE: "${APPNETA_DEMO_MODE:-true}"
};
EOF 