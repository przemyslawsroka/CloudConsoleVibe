#!/bin/bash

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"przemeksroka-joonix-service"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="cloudconsolevibe-frontend"

echo "🚀 Deploying Cloud Console Vibe to Cloud Run using Cloud Build..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Please authenticate with gcloud first:"
    echo "   gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy using Cloud Build configuration
echo "☁️ Building and deploying using Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

echo "✅ Deployment complete!"

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo "🌐 Service URL: $SERVICE_URL"

echo ""
echo "📋 Next steps:"
echo "1. Set up custom domain (optional)"
echo "2. Configure environment variables as needed"
echo "3. Set up monitoring and alerting"
echo "4. Configure CI/CD with Cloud Build" 