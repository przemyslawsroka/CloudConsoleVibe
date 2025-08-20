#!/bin/bash

# CloudConsoleVibe Full Stack Deployment Script
# Deploys both frontend and backend to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${PROJECT_ID:-"przemeksroka-joonix-service"}
REGION=${REGION:-"us-central1"}
FRONTEND_SERVICE="cloudconsolevibe-frontend"
BACKEND_SERVICE="cloudconsolevibe-backend"


echo -e "${BLUE}🚀 CloudConsoleVibe Full Stack Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"

./deploy/deploy-backend.sh

./deploy/deploy-frontend.sh

# Get service URLs
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)


# Step 5: Update backend CORS configuration
echo -e "${YELLOW}🔗 Updating backend CORS configuration...${NC}"
gcloud run services update $BACKEND_SERVICE \
    --region=$REGION \
    --set-env-vars="FRONTEND_URL=${FRONTEND_URL}" \
    --project=$PROJECT_ID

# Step 6: Configure monitoring agent connection
echo -e "${YELLOW}📊 Preparing monitoring agent configuration...${NC}"

# Create agent config with backend WebSocket URL
WEBSOCKET_URL="${BACKEND_URL}/api/v1/agents/connect"
cat > monitoring-agent/config-production.yaml << EOF
websocket:
  url: "${WEBSOCKET_URL}"
  agent_id: "monitoring-agent-\${HOSTNAME:-\$(uuidgen | cut -d'-' -f1)}"
  retry_attempts: 5
  retry_delay: 5000
  heartbeat_interval: 30

collection:
  interval: 30
  transmission_interval: 60
  batch_size: 100

targets:
  ping:
    - "8.8.8.8"
    - "1.1.1.1"
    - "google.com"
    - "cloudflare.com"
  dns:
    - "8.8.8.8"
    - "1.1.1.1"

filters:
  interfaces:
    - "eth0"
    - "en0"
  metrics:
    - "network.*"
    - "ping.*"
EOF

echo -e "${GREEN}✅ Created monitoring-agent/config-production.yaml${NC}"

# Summary
echo
echo -e "${BLUE}🎉 Deployment Complete!${NC}"
echo -e "${BLUE}======================${NC}"
echo
echo -e "${GREEN}📊 Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}🔧 Backend URL:  ${BACKEND_URL}${NC}"
echo -e "${GREEN}🔌 WebSocket:    ${WEBSOCKET_URL}${NC}"
echo
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${YELLOW}1. Test the deployment:${NC}"
echo -e "   curl ${BACKEND_URL}/health"
echo -e "   curl ${FRONTEND_URL}/health"
echo
echo -e "${YELLOW}2. Deploy monitoring agents:${NC}"
echo -e "   cd monitoring-agent"
echo -e "   export WEBSOCKET_URL=\"${WEBSOCKET_URL}\""
echo -e "   go run cmd/agent/main.go run --config config-production.yaml"
echo
echo -e "${YELLOW}3. Monitor the system:${NC}"
echo -e "   Open: ${FRONTEND_URL}"
echo -e "   Check: ${BACKEND_URL}/api/v1/agents"
echo -e "   Dashboard: ${BACKEND_URL}/api/v1/dashboard/overview"
echo
echo -e "${GREEN}✅ CloudConsoleVibe is now live in production! 🚀${NC}"
