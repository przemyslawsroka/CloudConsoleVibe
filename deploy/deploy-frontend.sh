#!/bin/bash

# CloudConsoleVibe Frontend Deployment Script
# Deploys the frontend to Google Cloud Run

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

echo -e "${BLUE}🚀 CloudConsoleVibe Frontend Deployment${NC}"
echo -e "${BLUE}======================================${NC}"

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

# Step 1: Get backend URL
echo -e "${YELLOW}🔍 Getting backend service URL...${NC}"
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)
check_command "Backend URL retrieval"

echo -e "${GREEN}✅ Found backend at: ${BACKEND_URL}${NC}"

# Step 2: Update frontend configuration with backend URL
echo -e "${YELLOW}🔄 Updating frontend configuration...${NC}"

# Update cloud build configuration
sed -i.bak "s|cloudconsolevibe-backend-HASH-uc.a.run.app|${BACKEND_URL#https://}|g" deploy/cloudbuild.yaml
sed -i.bak "s|cloudconsolevibe-backend-HASH-uc.a.run.app|${BACKEND_URL#https://}|g" deploy/cloud-run-service.yaml
sed -i.bak "s|cloudconsolevibe-backend-hash-uc.a.run.app|${BACKEND_URL#https://}|g" deploy/nginx-production.conf

# Step 3: Deploy Frontend
echo -e "${YELLOW}🎨 Deploying Frontend Service...${NC}"
gcloud builds submit --config deploy/cloudbuild.yaml --project=$PROJECT_ID
check_command "Frontend build and deployment"

# Restore original files
echo -e "${YELLOW}🔄 Restoring original configuration files...${NC}"
mv deploy/cloudbuild.yaml.bak deploy/cloudbuild.yaml 2>/dev/null || true
mv deploy/cloud-run-service.yaml.bak deploy/cloud-run-service.yaml 2>/dev/null || true
mv deploy/nginx-production.conf.bak deploy/nginx-production.conf 2>/dev/null || true


# Get frontend URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)
check_command "Frontend URL retrieval"

echo -e "${GREEN}✅ Frontend deployed at: ${FRONTEND_URL}${NC}"
