# 🚀 CloudConsoleVibe Deployment Guide

Complete guide for deploying CloudConsoleVibe with backend to Google Cloud Run.

## 📋 Prerequisites

### Required Tools
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- [Docker](https://docs.docker.com/get-docker/)
- [Node.js 18+](https://nodejs.org/)
- [Go 1.21+](https://golang.org/doc/install) (for monitoring agents)

### Google Cloud Setup
```bash
# Authenticate with Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com
```

## 🏗️ Architecture Overview

### Before (Single Service)
```
┌─────────────────┐
│  Cloud Run      │
│  ┌───────────┐  │
│  │ Frontend  │  │  ← Single container with Angular + nginx
│  │ (nginx)   │  │
│  └───────────┘  │
└─────────────────┘
```

### After (Multi-Service)
```
┌─────────────────┐    ┌─────────────────┐
│  Cloud Run      │    │  Cloud Run      │
│  ┌───────────┐  │    │  ┌───────────┐  │
│  │ Frontend  │  │───▶│  │ Backend   │  │
│  │ (nginx)   │  │    │  │ (Node.js) │  │
│  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘
                                ▲
                                │ WebSocket
                        ┌───────────────┐
                        │ Monitoring    │
                        │ Agents (Go)   │
                        └───────────────┘
```

## 🚀 Deployment Options

### Option 1: Automated Full Stack Deployment (Recommended)

Use the provided script for complete deployment:

```bash
# Clone and navigate to your repository
cd CloudConsoleVibe

# Run the full deployment script
./deploy-full-stack.sh
```

This script will:
1. Deploy the backend service
2. Deploy the frontend service
3. Configure networking between services
4. Set up CORS policies
5. Generate monitoring agent configuration

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Deploy Backend

```bash
# Build and deploy backend
gcloud builds submit --config cloudbuild-backend.yaml

# Get backend URL
BACKEND_URL=$(gcloud run services describe cloudconsolevibe-backend --region=us-central1 --format="value(status.url)")
echo "Backend URL: $BACKEND_URL"
```

#### Step 2: Update Frontend Configuration

```bash
# Update configurations with actual backend URL
sed -i "s|cloudconsolevibe-backend-HASH-uc.a.run.app|${BACKEND_URL#https://}|g" cloudbuild.yaml
sed -i "s|cloudconsolevibe-backend-HASH-uc.a.run.app|${BACKEND_URL#https://}|g" cloud-run-service.yaml
```

#### Step 3: Deploy Frontend

```bash
# Build and deploy frontend
gcloud builds submit --config cloudbuild.yaml

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe cloudconsolevibe-frontend --region=us-central1 --format="value(status.url)")
echo "Frontend URL: $FRONTEND_URL"
```

#### Step 4: Configure CORS

```bash
# Update backend CORS settings
gcloud run services update cloudconsolevibe-backend \
    --region=us-central1 \
    --set-env-vars="FRONTEND_URL=${FRONTEND_URL}"
```

## 🔧 Configuration Files

### Backend Configuration (`cloudbuild-backend.yaml`)
- Builds Node.js backend Docker image
- Deploys to Cloud Run with WebSocket support
- Configures 2GB memory, 2 CPU cores
- Sets session affinity for WebSocket connections

### Frontend Configuration (`cloudbuild.yaml`)
- Builds Angular frontend with nginx
- Configures proxy to backend service
- Deploys with production optimizations

### Service Specifications
- **Backend**: WebSocket-enabled, session affinity, 3600s timeout
- **Frontend**: Static serving with API proxy, standard timeout

## 🌐 Networking & Security

### Service Communication
```
Frontend ──HTTP/WebSocket──▶ Backend
                            ▲
                            │ WebSocket
                    Monitoring Agents
```

### Security Features
- **CORS**: Properly configured between frontend and backend
- **Headers**: Security headers in nginx configuration
- **Authentication**: Ready for JWT implementation
- **Rate Limiting**: Built into backend API

## 📊 Monitoring Agent Integration

### Production Configuration
After deployment, the script creates `monitoring-agent/config-production.yaml`:

```yaml
websocket:
  url: "wss://your-backend-url/api/v1/agents/connect"
  agent_id: "monitoring-agent-${HOSTNAME}"
  retry_attempts: 5
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
```

### Deploy Monitoring Agents
```bash
# On target machines/instances
cd monitoring-agent
export WEBSOCKET_URL="wss://your-backend-url/api/v1/agents/connect"
go run cmd/agent/main.go run --config config-production.yaml
```

## 🔍 Testing & Verification

### Health Checks
```bash
# Test backend health
curl https://your-backend-url/health

# Test frontend health  
curl https://your-frontend-url/health

# Test API endpoints
curl https://your-backend-url/api/v1/agents
curl https://your-backend-url/api/v1/dashboard/overview
```

### WebSocket Testing
```bash
# Install wscat for testing
npm install -g wscat

# Test WebSocket connection
wscat -c "wss://your-backend-url/api/v1/agents/connect?agent_id=test-001&provider=gcp&region=us-central1"
```

### Frontend Testing
```bash
# Open in browser
open https://your-frontend-url

# Check browser console for API calls
# Verify monitoring dashboard loads
```

## 📈 Production Considerations

### Scaling Configuration

#### Backend Scaling
```yaml
# In cloud-run-backend.yaml
autoscaling.knative.dev/maxScale: "20"
autoscaling.knative.dev/minScale: "1"
```

#### Frontend Scaling
```yaml
# In cloud-run-service.yaml
autoscaling.knative.dev/maxScale: "10"
autoscaling.knative.dev/minScale: "0"
```

### Database Considerations

#### SQLite (Default)
- ✅ Good for: Development, small-scale production
- ❌ Limitations: Single-instance, no horizontal scaling
- 📊 Data stored in container's ephemeral storage

#### PostgreSQL (Recommended for Production)
```bash
# Create Cloud SQL instance
gcloud sql instances create cloudconsolevibe-db \
    --database-version=POSTGRES_14 \
    --tier=db-g1-small \
    --region=us-central1

# Update backend environment variables
gcloud run services update cloudconsolevibe-backend \
    --set-env-vars="DB_TYPE=postgresql,DB_HOST=your-db-ip,DB_NAME=monitoring,DB_USER=postgres,DB_PASSWORD=your-password"
```

### Persistent Storage

For production with SQLite:
```bash
# Mount Cloud Storage bucket for data persistence
gcloud run services update cloudconsolevibe-backend \
    --add-cloudsql-instances=PROJECT:REGION:INSTANCE
```

### Performance Optimization

#### Backend Optimizations
- **CPU**: 2 cores minimum for WebSocket handling
- **Memory**: 2GB for metric processing and caching
- **Concurrency**: 1000 concurrent requests
- **Session Affinity**: Required for WebSocket connections

#### Frontend Optimizations
- **CDN**: Use Cloud CDN for static assets
- **Compression**: Gzip enabled in nginx
- **Caching**: Aggressive caching for static resources

## 🚨 Monitoring & Alerting

### Cloud Monitoring Setup
```bash
# Enable monitoring API
gcloud services enable monitoring.googleapis.com

# Create alerting policies for:
# - Service availability
# - Response time
# - Error rates
# - WebSocket connection count
```

### Log Analysis
```bash
# View backend logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=cloudconsolevibe-backend"

# View frontend logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=cloudconsolevibe-frontend"
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Cloud Run
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Deploy Full Stack
        run: ./deploy-full-stack.sh
```

### Cloud Build Triggers
```bash
# Create trigger for backend
gcloud builds triggers create github \
    --repo-name=CloudConsoleVibe \
    --repo-owner=your-username \
    --branch-pattern="^main$" \
    --build-config=cloudbuild-backend.yaml

# Create trigger for frontend
gcloud builds triggers create github \
    --repo-name=CloudConsoleVibe \
    --repo-owner=your-username \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

## 🛠️ Troubleshooting

### Common Issues

#### WebSocket Connection Failures
```bash
# Check backend logs for WebSocket errors
gcloud logs read "resource.type=cloud_run_revision AND jsonPayload.message:websocket"

# Verify session affinity is enabled
gcloud run services describe cloudconsolevibe-backend --format="value(spec.template.metadata.annotations)"
```

#### CORS Issues
```bash
# Check if FRONTEND_URL is set correctly
gcloud run services describe cloudconsolevibe-backend --format="value(spec.template.spec.containers[0].env[?name='FRONTEND_URL'].value)"

# Update CORS configuration
gcloud run services update cloudconsolevibe-backend \
    --set-env-vars="FRONTEND_URL=https://your-frontend-url"
```

#### Database Connection Issues
```bash
# Check database environment variables
gcloud run services describe cloudconsolevibe-backend --format="value(spec.template.spec.containers[0].env)"

# Test database connectivity
curl https://your-backend-url/health
```

### Performance Issues

#### High Latency
- Increase CPU allocation: `--cpu=4`
- Increase memory: `--memory=4Gi`
- Check database query performance
- Enable request/response compression

#### WebSocket Timeouts
- Increase timeout: `--timeout=3600`
- Check network connectivity
- Verify load balancer configuration

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [WebSocket on Cloud Run](https://cloud.google.com/run/docs/triggering/websockets)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Backend API Documentation](backend/README.md)

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring dashboards** in Cloud Console
2. **Configure alerting policies** for service health
3. **Deploy monitoring agents** to target infrastructure
4. **Create custom dashboards** in the frontend
5. **Set up backup and disaster recovery** procedures

Your CloudConsoleVibe deployment is now production-ready! 🚀 