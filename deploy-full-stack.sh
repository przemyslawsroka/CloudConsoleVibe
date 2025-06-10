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
PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project)}
REGION=${REGION:-"us-central1"}
FRONTEND_SERVICE="cloudconsolevibe-frontend"
BACKEND_SERVICE="cloudconsolevibe-backend"

echo -e "${BLUE}🚀 CloudConsoleVibe Full Stack Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: PROJECT_ID not set. Please set it or configure gcloud default project.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project ID: ${PROJECT_ID}${NC}"
echo -e "${GREEN}✅ Region: ${REGION}${NC}"
echo

# Function to check if command succeeded
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completed successfully${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Enable required APIs
echo -e "${YELLOW}📡 Enabling required Google Cloud APIs...${NC}"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com
check_command "API enablement"

# Step 2: Deploy Backend
echo -e "${YELLOW}🔧 Deploying Backend Service...${NC}"
gcloud builds submit --config cloudbuild-backend.yaml --project=$PROJECT_ID
check_command "Backend build and deployment"

# Get backend URL
echo -e "${YELLOW}🔍 Getting backend service URL...${NC}"
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")
check_command "Backend URL retrieval"

echo -e "${GREEN}✅ Backend deployed at: ${BACKEND_URL}${NC}"

# Step 3: Update frontend configuration with backend URL
echo -e "${YELLOW}🔄 Updating frontend configuration...${NC}"

# Update cloud build configuration
sed -i.bak "s|cloudconsolevibe-backend-HASH-uc.a.run.app|${BACKEND_URL#https://}|g" cloudbuild.yaml
sed -i.bak "s|cloudconsolevibe-backend-HASH-uc.a.run.app|${BACKEND_URL#https://}|g" cloud-run-service.yaml
sed -i.bak "s|cloudconsolevibe-backend-hash-uc.a.run.app|${BACKEND_URL#https://}|g" nginx-production.conf

# Step 4: Deploy Frontend
echo -e "${YELLOW}🎨 Deploying Frontend Service...${NC}"
gcloud builds submit --config cloudbuild.yaml --project=$PROJECT_ID
check_command "Frontend build and deployment"

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)")
check_command "Frontend URL retrieval"

# Step 5: Update backend CORS configuration
echo -e "${YELLOW}🔗 Updating backend CORS configuration...${NC}"
gcloud run services update $BACKEND_SERVICE \
    --region=$REGION \
    --set-env-vars="FRONTEND_URL=${FRONTEND_URL}" \
    --project=$PROJECT_ID
check_command "Backend CORS update"

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

# Step 7: Restore original files
echo -e "${YELLOW}🔄 Restoring original configuration files...${NC}"
mv cloudbuild.yaml.bak cloudbuild.yaml 2>/dev/null || true
mv cloud-run-service.yaml.bak cloud-run-service.yaml 2>/dev/null || true
mv nginx-production.conf.bak nginx-production.conf 2>/dev/null || true

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