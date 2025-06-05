#!/bin/bash

set -e

PROJECT_ID=${PROJECT_ID:-"your-project-id"}
SERVICE_ACCOUNT_NAME="cloud-console-vibe-sa"

echo "🔐 Setting up IAM for Cloud Console Vibe..."
echo "Project: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT_NAME"

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Please authenticate with gcloud first:"
    echo "   gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Check if service account already exists
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com >/dev/null 2>&1; then
    echo "✅ Service account $SERVICE_ACCOUNT_NAME already exists"
else
    echo "📝 Creating service account..."
    # Create service account
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --description="Service account for Cloud Console Vibe app" \
        --display-name="Cloud Console Vibe"
    echo "✅ Service account created"
fi

echo "🔑 Assigning IAM roles..."

# Grant necessary permissions (minimal for security)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/monitoring.metricWriter"

# For Cloud Build (if using CI/CD)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.developer"

# For Container Registry access
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

echo "✅ IAM setup complete!"
echo ""
echo "📋 Service account details:"
echo "   Email: $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
echo "   Roles assigned:"
echo "   - roles/logging.logWriter"
echo "   - roles/monitoring.metricWriter"
echo "   - roles/run.developer"
echo "   - roles/storage.objectViewer"
echo ""
echo "🚀 You can now run ./deploy.sh to deploy your application" 