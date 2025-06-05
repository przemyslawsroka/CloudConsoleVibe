#!/bin/bash

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="cloud-console-vibe"
IMAGE_TAG=${IMAGE_TAG:-"latest"}

echo "🚀 Deploying Cloud Console Vibe to Cloud Run..."
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

# Configure Docker for GCP
echo "🐋 Configuring Docker..."
gcloud auth configure-docker

# Build and push image for AMD64 platform (Cloud Run compatibility)
echo "📦 Building Docker image for AMD64/Linux platform..."
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG .

echo "📤 Pushing image to Container Registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10 \
    --min-instances 0 \
    --concurrency 100 \
    --timeout 300 \
    --set-env-vars ENVIRONMENT=production,LOG_LEVEL=info \
    --service-account cloud-console-vibe-sa@$PROJECT_ID.iam.gserviceaccount.com

echo "✅ Deployment complete!"

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo "🌐 Service URL: $SERVICE_URL"
echo "🏥 Health check: $SERVICE_URL/health"

echo ""
echo "📋 Next steps:"
echo "1. Set up custom domain (optional)"
echo "2. Configure environment variables as needed"
echo "3. Set up monitoring and alerting"
echo "4. Configure CI/CD with Cloud Build" 