#!/bin/bash

# CloudConsoleVibe Backend Deployment Script
# Deploys the backend to Google Cloud Run

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
BACKEND_SERVICE="cloudconsolevibe-backend"

echo -e "${BLUE}🚀 CloudConsoleVibe Backend Deployment${NC}"
echo -e "${BLUE}====================================${NC}"

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
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com --project=$PROJECT_ID
check_command "API enablement"

# Step 2: Deploy Backend
echo -e "${YELLOW}🔧 Deploying Backend Service...${NC}"
gcloud builds submit --config deploy/cloudbuild-backend.yaml --project=$PROJECT_ID
check_command "Backend build and deployment"

# Get backend URL
echo -e "${YELLOW}🔍 Getting backend service URL...${NC}"
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)
check_command "Backend URL retrieval"

echo -e "${GREEN}✅ Backend deployed at: ${BACKEND_URL}${NC}"
